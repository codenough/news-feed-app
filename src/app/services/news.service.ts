import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { NewsArticle } from '../models/news-article.interface';
import { ArticlePersistenceService } from './article-persistence.service';

export type SortOrder = 'desc' | 'asc';
export type FilterType = 'all' | 'unread' | 'read' | 'bookmarked';

export interface FetchArticlesParams {
  sortBy?: 'publishedAt' | 'title';
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
  sources?: string[];
  category?: string;
  searchQuery?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private readonly API_BASE_URL = '/api/news';

  private articlesSubject = new BehaviorSubject<NewsArticle[]>([]);
  private allArticles = signal<NewsArticle[]>([]);

  currentFilter = signal<FilterType>('all');
  currentSortOrder = signal<SortOrder>('desc');

  articles$ = computed(() => {
    return this.filterArticles(this.allArticles(), this.currentFilter());
  });

  lastFetchTimestamp = signal<Date | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private persistenceService = inject(ArticlePersistenceService);

  constructor(private http: HttpClient) {}

  fetchArticles(params: FetchArticlesParams = {}): Observable<NewsArticle[]> {
    this.isLoading.set(true);
    this.error.set(null);

    const defaultParams: FetchArticlesParams = {
      sortBy: 'publishedAt',
      sortOrder: this.currentSortOrder(),
      page: 1,
      pageSize: 20,
      ...params
    };

    let httpParams = new HttpParams();
    if (defaultParams.sortBy) httpParams = httpParams.set('sortBy', defaultParams.sortBy);
    if (defaultParams.sortOrder) httpParams = httpParams.set('sortOrder', defaultParams.sortOrder);
    if (defaultParams.page) httpParams = httpParams.set('page', defaultParams.page.toString());
    if (defaultParams.pageSize) httpParams = httpParams.set('pageSize', defaultParams.pageSize.toString());
    if (defaultParams.category) httpParams = httpParams.set('category', defaultParams.category);
    if (defaultParams.searchQuery) httpParams = httpParams.set('q', defaultParams.searchQuery);
    if (defaultParams.sources && defaultParams.sources.length > 0) {
      httpParams = httpParams.set('sources', defaultParams.sources.join(','));
    }

    return this.http.get<NewsArticle[]>(this.API_BASE_URL, { params: httpParams }).pipe(
      tap(articles => {
        const parsedArticles = articles.map(article => ({
          ...article,
          publishedAt: new Date(article.publishedAt)
        }));

        this.articlesSubject.next(parsedArticles);
        this.lastFetchTimestamp.set(new Date());
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Error fetching articles:', error);
        this.error.set(error.message || 'Failed to fetch articles');
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  refresh(): Observable<NewsArticle[]> {
    return this.fetchArticles();
  }

  setSortOrder(order: SortOrder): void {
    this.currentSortOrder.set(order);
  }

  sortArticlesLocally(articles: NewsArticle[], order: SortOrder = 'desc'): NewsArticle[] {
    return [...articles].sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();

      return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }

  setFilter(filter: FilterType): void {
    this.currentFilter.set(filter);
  }

  filterArticles(articles: NewsArticle[], filter: FilterType): NewsArticle[] {
    switch (filter) {
      case 'unread':
        return articles.filter(article => !article.isRead);
      case 'read':
        return articles.filter(article => article.isRead);
      case 'bookmarked':
        return articles.filter(article => article.isBookmarked);
      case 'all':
      default:
        return articles;
    }
  }

  toggleBookmark(articleId: string): void {
    const articles = this.allArticles();
    const updatedArticles = articles.map(article =>
      article.id === articleId
        ? { ...article, isBookmarked: !article.isBookmarked }
        : article
    );
    this.allArticles.set(updatedArticles);

    const article = updatedArticles.find(a => a.id === articleId);
    if (article) {
      this.persistenceService.saveArticleState(articleId, { isBookmarked: article.isBookmarked });
    }
  }

  toggleReadLater(articleId: string): void {
    const articles = this.allArticles();
    const updatedArticles = articles.map(article =>
      article.id === articleId
        ? { ...article, isReadLater: !article.isReadLater }
        : article
    );
    this.allArticles.set(updatedArticles);

    const article = updatedArticles.find(a => a.id === articleId);
    if (article) {
      this.persistenceService.saveArticleState(articleId, { isReadLater: article.isReadLater });
    }
  }

  markAsRead(articleId: string): void {
    const articles = this.allArticles();
    const updatedArticles = articles.map(article =>
      article.id === articleId
        ? { ...article, isRead: true }
        : article
    );
    this.allArticles.set(updatedArticles);

    this.persistenceService.saveArticleState(articleId, { isRead: true });
  }

  toggleReadStatus(articleId: string): void {
    const articles = this.allArticles();
    const updatedArticles = articles.map(article =>
      article.id === articleId
        ? { ...article, isRead: !article.isRead }
        : article
    );
    this.allArticles.set(updatedArticles);

    const article = updatedArticles.find(a => a.id === articleId);
    if (article) {
      this.persistenceService.saveArticleState(articleId, { isRead: article.isRead });
    }
  }

  skipArticle(articleId: string): void {
    const articles = this.allArticles();
    const updatedArticles = articles.map(article =>
      article.id === articleId
        ? { ...article, isSkipped: true }
        : article
    );
    this.allArticles.set(updatedArticles);

    this.persistenceService.saveArticleState(articleId, { isSkipped: true });
  }

  undoSkip(articleId: string): void {
    const articles = this.allArticles();
    const updatedArticles = articles.map(article =>
      article.id === articleId
        ? { ...article, isSkipped: false }
        : article
    );
    this.allArticles.set(updatedArticles);

    this.persistenceService.saveArticleState(articleId, { isSkipped: false });
  }

  getMockArticles(): NewsArticle[] {
    return [
      {
        id: '1',
        title: 'Breaking: New Climate Agreement Reached at Global Summit',
        description: 'World leaders have agreed to ambitious new targets for reducing carbon emissions, marking a historic moment in the fight against climate change.',
        imageUrl: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&h=600&fit=crop',
        sourceName: 'Global News Network',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        url: 'https://example.com/article1',
        isRead: false,
        isBookmarked: false,
        isReadLater: false,
        isSkipped: false,
        category: 'Environment'
      },
      {
        id: '2',
        title: 'Tech Giant Announces Revolutionary AI Breakthrough',
        description: 'The company\'s latest artificial intelligence system demonstrates unprecedented capabilities in natural language understanding and generation.',
        imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop',
        sourceName: 'Tech Today',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        url: 'https://example.com/article2',
        isRead: false,
        isBookmarked: false,
        isReadLater: false,
        isSkipped: false,
        category: 'Technology'
      },
      {
        id: '3',
        title: 'Local Community Rallies to Support New Education Initiative',
        description: 'Residents come together to fund programs aimed at improving educational opportunities for underserved students in the district.',
        imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop',
        sourceName: 'Community Voice',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        url: 'https://example.com/article3',
        isRead: false,
        isBookmarked: false,
        isReadLater: false,
        isSkipped: false,
        category: 'Education'
      },
      {
        id: '4',
        title: 'Stock Markets Show Strong Recovery After Turbulent Week',
        description: 'Major indices close higher as investors regain confidence following positive economic indicators and corporate earnings reports.',
        imageUrl: '',
        sourceName: 'Financial Times',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        url: 'https://example.com/article4',
        isRead: false,
        isBookmarked: false,
        isReadLater: false,
        isSkipped: false,
        category: 'Business'
      },
      {
        id: '5',
        title: 'Medical Researchers Make Breakthrough in Cancer Treatment',
        description: 'New therapy shows promising results in clinical trials, offering hope to patients with previously untreatable forms of the disease.',
        imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop',
        sourceName: 'Health Journal',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        url: 'https://example.com/article5',
        isRead: false,
        isBookmarked: false,
        isReadLater: false,
        isSkipped: false,
        category: 'Health'
      },
      {
        id: '6',
        title: 'Championship Game Delivers Historic Upset Victory',
        description: 'Underdog team defeats favorites in thrilling overtime finish, claiming their first title in franchise history.',
        imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
        sourceName: 'Sports Network',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        url: 'https://example.com/article6',
        isRead: false,
        isBookmarked: false,
        isReadLater: false,
        isSkipped: false,
        category: 'Sports'
      }
    ];
  }

  loadMockData(): void {
    const mockArticles = this.getMockArticles();

    const articlesWithPersistedState = mockArticles.map(article => {
      const persistedState = this.persistenceService.getArticleState(article.id);
      if (persistedState) {
        return {
          ...article,
          isRead: persistedState.isRead,
          isBookmarked: persistedState.isBookmarked,
          isReadLater: persistedState.isReadLater,
          isSkipped: persistedState.isSkipped
        };
      }
      return article;
    });

    const sortedArticles = this.sortArticlesLocally(articlesWithPersistedState, this.currentSortOrder());
    this.allArticles.set(sortedArticles);
    this.lastFetchTimestamp.set(new Date());
  }
}
