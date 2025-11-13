import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of, forkJoin } from 'rxjs';
import { NewsArticle } from '../models/news-article.interface';
import { ArticlePersistenceService } from './article-persistence.service';
import { SourceManagementService } from './source-management.service';
import { RssParserService } from './rss-parser.service';

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
  startDate?: Date;
  endDate?: Date;
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
  searchQuery = signal<string>('');
  selectedSource = signal<string | null>(null);
  dateRange = signal<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });

  articles$ = computed(() => {
    let filtered = this.filterArticles(this.allArticles(), this.currentFilter());
    filtered = this.filterBySource(filtered, this.selectedSource());
    filtered = this.filterByDateRange(filtered, this.dateRange());
    filtered = this.searchArticles(filtered, this.searchQuery());
    // Apply sorting
    return this.sortArticlesLocally(filtered, this.currentSortOrder());
  });

  sources$ = computed(() => {
    const articles = this.allArticles();
    const sourcesMap = new Map<string, { total: number; unread: number }>();

    articles.forEach(article => {
      const existing = sourcesMap.get(article.sourceName) || { total: 0, unread: 0 };
      existing.total++;
      if (!article.isRead) {
        existing.unread++;
      }
      sourcesMap.set(article.sourceName, existing);
    });

    return Array.from(sourcesMap.entries())
      .map(([name, counts]) => ({
        name,
        total: counts.total,
        unreadCount: counts.unread
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  lastFetchTimestamp = signal<Date | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private persistenceService = inject(ArticlePersistenceService);
  private sourceManagementService = inject(SourceManagementService);
  private rssParserService = inject(RssParserService);

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
    if (defaultParams.startDate) {
      httpParams = httpParams.set('startDate', defaultParams.startDate.toISOString());
    }
    if (defaultParams.endDate) {
      httpParams = httpParams.set('endDate', defaultParams.endDate.toISOString());
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
    // Use smart merge when refreshing
    this.loadFromRSSFeeds();
    return of(this.allArticles());
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

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setSelectedSource(source: string | null): void {
    this.selectedSource.set(source);
  }

  setDateRange(startDate: Date | null, endDate: Date | null): void {
    this.dateRange.set({ startDate, endDate });
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

  filterBySource(articles: NewsArticle[], source: string | null): NewsArticle[] {
    if (!source) {
      return articles;
    }
    return articles.filter(article => article.sourceName === source);
  }

  filterByDateRange(articles: NewsArticle[], range: { startDate: Date | null; endDate: Date | null }): NewsArticle[] {
    if (!range.startDate && !range.endDate) {
      return articles;
    }

    return articles.filter(article => {
      const articleDate = new Date(article.publishedAt);
      articleDate.setHours(0, 0, 0, 0);

      if (range.startDate && range.endDate) {
        const start = new Date(range.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(range.endDate);
        end.setHours(23, 59, 59, 999);
        return articleDate >= start && articleDate <= end;
      }

      if (range.startDate) {
        const start = new Date(range.startDate);
        start.setHours(0, 0, 0, 0);
        return articleDate >= start;
      }

      if (range.endDate) {
        const end = new Date(range.endDate);
        end.setHours(23, 59, 59, 999);
        return articleDate <= end;
      }

      return true;
    });
  }

  searchArticles(articles: NewsArticle[], query: string): NewsArticle[] {
    if (!query || query.trim() === '') {
      return articles;
    }

    const searchTerms = query.toLowerCase().trim().split(/\s+/);

    return articles.filter(article => {
      const titleLower = article.title.toLowerCase();
      const descriptionLower = article.description.toLowerCase();

      // Check if all search terms exist in either title or description
      return searchTerms.every(term =>
        titleLower.includes(term) || descriptionLower.includes(term)
      );
    });
  }

  toggleBookmark(articleId: string): void {
    const articles = this.allArticles();
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const updatedArticles = articles.map(a =>
      a.id === articleId
        ? { ...a, isBookmarked: !a.isBookmarked }
        : a
    );
    this.allArticles.set(updatedArticles);

    const updatedArticle = updatedArticles.find(a => a.id === articleId);
    if (updatedArticle) {
      const persistenceKey = this.getArticleUniqueKey(updatedArticle);
      this.persistenceService.saveArticleState(persistenceKey, { isBookmarked: updatedArticle.isBookmarked });
    }
  }

  toggleReadLater(articleId: string): void {
    const articles = this.allArticles();
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const updatedArticles = articles.map(a =>
      a.id === articleId
        ? { ...a, isReadLater: !a.isReadLater }
        : a
    );
    this.allArticles.set(updatedArticles);

    const updatedArticle = updatedArticles.find(a => a.id === articleId);
    if (updatedArticle) {
      const persistenceKey = this.getArticleUniqueKey(updatedArticle);
      this.persistenceService.saveArticleState(persistenceKey, { isReadLater: updatedArticle.isReadLater });
    }
  }

  markAsRead(articleId: string): void {
    const articles = this.allArticles();
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const updatedArticles = articles.map(a =>
      a.id === articleId
        ? { ...a, isRead: true }
        : a
    );
    this.allArticles.set(updatedArticles);

    const updatedArticle = updatedArticles.find(a => a.id === articleId);
    if (updatedArticle) {
      const persistenceKey = this.getArticleUniqueKey(updatedArticle);
      this.persistenceService.saveArticleState(persistenceKey, { isRead: true });
    }
  }

  toggleReadStatus(articleId: string): void {
    const articles = this.allArticles();
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const updatedArticles = articles.map(a =>
      a.id === articleId
        ? { ...a, isRead: !a.isRead }
        : a
    );
    this.allArticles.set(updatedArticles);

    const updatedArticle = updatedArticles.find(a => a.id === articleId);
    if (updatedArticle) {
      const persistenceKey = this.getArticleUniqueKey(updatedArticle);
      this.persistenceService.saveArticleState(persistenceKey, { isRead: updatedArticle.isRead });
    }
  }

  skipArticle(articleId: string): void {
    const articles = this.allArticles();
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const updatedArticles = articles.map(a =>
      a.id === articleId
        ? { ...a, isSkipped: true }
        : a
    );
    this.allArticles.set(updatedArticles);

    const updatedArticle = updatedArticles.find(a => a.id === articleId);
    if (updatedArticle) {
      const persistenceKey = this.getArticleUniqueKey(updatedArticle);
      this.persistenceService.saveArticleState(persistenceKey, { isSkipped: true });
    }
  }

  undoSkip(articleId: string): void {
    const articles = this.allArticles();
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const updatedArticles = articles.map(a =>
      a.id === articleId
        ? { ...a, isSkipped: false }
        : a
    );
    this.allArticles.set(updatedArticles);

    const updatedArticle = updatedArticles.find(a => a.id === articleId);
    if (updatedArticle) {
      const persistenceKey = this.getArticleUniqueKey(updatedArticle);
      this.persistenceService.saveArticleState(persistenceKey, { isSkipped: false });
    }
  }

  getMockArticles(): NewsArticle[] {
    return [
      {
        id: '1',
        title: 'Breaking: New Climate Agreement Reached at Global Summit',
        description: 'World leaders have agreed to ambitious new targets for reducing carbon emissions, marking a historic moment in the fight against climate change.',
        imageUrl: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&h=600&fit=crop',
        sourceName: 'TechCrunch',
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
        sourceName: 'The Verge',
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
        sourceName: 'Hacker News',
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
        sourceName: 'TechCrunch',
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
        sourceName: 'The Verge',
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
        sourceName: 'TechCrunch',
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
    // Try to load from RSS feeds first
    this.loadFromRSSFeeds();
  }

  loadFromRSSFeeds(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Get enabled sources
    const enabledSources = this.sourceManagementService.getEnabledSources();

    // If no enabled sources, show empty state
    if (enabledSources.length === 0) {
      this.allArticles.set([]);
      this.isLoading.set(false);
      return;
    }

    // Fetch from all enabled RSS feeds
    const feedRequests = enabledSources.map(source =>
      this.rssParserService.fetchAndParseRSS(source.url, source.name)
    );

    forkJoin(feedRequests).subscribe({
      next: (results) => {
        // Combine all articles from all sources
        const allFetchedArticles: NewsArticle[] = [];
        const errors: string[] = [];

        results.forEach((result, index) => {
          if (result.error) {
            errors.push(`${enabledSources[index].name}: ${result.error}`);
          } else {
            allFetchedArticles.push(...result.articles);
          }
        });

        // If all feeds failed, fall back to mock data
        if (allFetchedArticles.length === 0) {
          console.warn('All RSS feeds failed, using mock data');
          if (errors.length > 0) {
            this.error.set(`RSS feed errors: ${errors.join('; ')}`);
          }
          this.loadMockDataFallback();
          return;
        }

        // Smart merge: combine new articles with existing ones
        const mergedArticles = this.mergeArticles(this.allArticles(), allFetchedArticles);

        const sortedArticles = this.sortArticlesLocally(mergedArticles, this.currentSortOrder());
        this.allArticles.set(sortedArticles);
        this.lastFetchTimestamp.set(new Date());
        this.isLoading.set(false);

        // Show warning if some feeds failed
        if (errors.length > 0 && allFetchedArticles.length > 0) {
          console.warn('Some RSS feeds failed:', errors);
        }
      },
      error: (err) => {
        console.error('Error loading RSS feeds:', err);
        this.error.set('Failed to load RSS feeds');
        this.loadMockDataFallback();
      }
    });
  }

  /**
   * Smart merge of new articles with existing ones.
   * - Preserves existing article states (read, bookmarked, read later, skipped)
   * - Adds only new unique articles
   * - Maintains old articles
   * - New articles are added on top (by date)
   */
  private mergeArticles(existingArticles: NewsArticle[], newArticles: NewsArticle[]): NewsArticle[] {
    // Create a map of existing articles by unique identifier
    const existingMap = new Map<string, NewsArticle>();

    existingArticles.forEach(article => {
      // Use URL as unique identifier (more reliable than generated IDs)
      const key = this.getArticleUniqueKey(article);
      existingMap.set(key, article);
    });

    // Process new articles
    const articlesToAdd: NewsArticle[] = [];

    newArticles.forEach(newArticle => {
      const key = this.getArticleUniqueKey(newArticle);
      const existing = existingMap.get(key);

      if (existing) {
        // Article already exists - preserve its state
        // Don't add to articlesToAdd since it's already in existingArticles
      } else {
        // New article - check if it has persisted state using URL-based key
        const persistedState = this.persistenceService.getArticleState(key);
        if (persistedState) {
          articlesToAdd.push({
            ...newArticle,
            isRead: persistedState.isRead,
            isBookmarked: persistedState.isBookmarked,
            isReadLater: persistedState.isReadLater,
            isSkipped: persistedState.isSkipped
          });
        } else {
          articlesToAdd.push(newArticle);
        }
      }
    });

    // Combine: new articles first, then existing articles
    return [...articlesToAdd, ...existingArticles];
  }

  /**
   * Generate a unique key for an article based on URL and title
   * URL is the most reliable identifier across fetches
   */
  private getArticleUniqueKey(article: NewsArticle): string {
    // Use URL as primary key, fallback to title + source
    if (article.url) {
      return article.url.toLowerCase().trim();
    }
    return `${article.sourceName}-${article.title}`.toLowerCase().trim();
  }

  private loadMockDataFallback(): void {
    // Get enabled sources
    const enabledSources = this.sourceManagementService.getEnabledSources();

    // If no enabled sources, show empty state
    if (enabledSources.length === 0) {
      this.allArticles.set([]);
      this.lastFetchTimestamp.set(new Date());
      this.isLoading.set(false);
      return;
    }

    // Filter mock articles to only show those from enabled sources
    const mockArticles = this.getMockArticles();
    const sourceNames = new Set(enabledSources.map(s => s.name));

    const filteredArticles = mockArticles.filter(article =>
      sourceNames.has(article.sourceName)
    );

    const articlesWithPersistedState = filteredArticles.map(article => {
      // Use URL-based key for persistence
      const persistenceKey = this.getArticleUniqueKey(article);
      const persistedState = this.persistenceService.getArticleState(persistenceKey);
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
    this.isLoading.set(false);
  }
}
