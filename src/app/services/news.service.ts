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
      const newState = {
        isRead: updatedArticle.isRead,
        isBookmarked: updatedArticle.isBookmarked,
        isReadLater: updatedArticle.isReadLater,
        isSkipped: updatedArticle.isSkipped
      };
      this.persistenceService.saveArticleState(persistenceKey, newState);
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

        // If all feeds failed, show error
        if (allFetchedArticles.length === 0) {
          console.error('All RSS feeds failed');
          if (errors.length > 0) {
            this.error.set(`RSS feed errors: ${errors.join('; ')}`);
          } else {
            this.error.set('Failed to load articles from RSS feeds');
          }
          this.allArticles.set([]);
          this.isLoading.set(false);
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
        this.allArticles.set([]);
        this.isLoading.set(false);
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
}
