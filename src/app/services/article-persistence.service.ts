import { Injectable } from '@angular/core';
import { ExternalArticle } from '../models/external-article.interface';

export interface ArticleState {
  isRead: boolean;
  isBookmarked: boolean;
  isReadLater: boolean;
  isSkipped: boolean;
  lastModified: number;
}

export interface ArticleStatesMap {
  [articleId: string]: ArticleState;
}

@Injectable({
  providedIn: 'root'
})
export class ArticlePersistenceService {
  private readonly STORAGE_KEY = 'chronicle-article-states';
  private readonly EXTERNAL_ARTICLES_KEY = 'chronicle-external-articles';
  private readonly MAX_STORAGE_ITEMS = 1000;

  saveArticleState(articleId: string, state: Partial<ArticleState>): void {
    const states = this.getAllStates();

    const existingState = states[articleId] || {
      isRead: false,
      isBookmarked: false,
      isReadLater: false,
      isSkipped: false,
      lastModified: Date.now()
    };

    states[articleId] = {
      ...existingState,
      ...state,
      lastModified: Date.now()
    };

    this.pruneOldStates(states);
    this.saveAllStates(states);
  }

  getArticleState(articleId: string): ArticleState | null {
    const states = this.getAllStates();
    return states[articleId] || null;
  }

  getAllStates(): ArticleStatesMap {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return {};

      return JSON.parse(data) as ArticleStatesMap;
    } catch (error) {
      console.error('Error reading article states from localStorage:', error);
      return {};
    }
  }

  saveAllStates(states: ArticleStatesMap): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error('Error saving article states to localStorage:', error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clearOldStates();
      }
    }
  }

  clearArticleState(articleId: string): void {
    const states = this.getAllStates();
    delete states[articleId];
    this.saveAllStates(states);
  }

  clearAllStates(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing article states:', error);
    }
  }

  private pruneOldStates(states: ArticleStatesMap): void {
    const stateEntries = Object.entries(states);

    if (stateEntries.length > this.MAX_STORAGE_ITEMS) {
      const sortedByDate = stateEntries.sort((a, b) => b[1].lastModified - a[1].lastModified);
      const prunedStates = Object.fromEntries(sortedByDate.slice(0, this.MAX_STORAGE_ITEMS));

      Object.keys(states).forEach(key => {
        if (!(key in prunedStates)) {
          delete states[key];
        }
      });
    }
  }

  private clearOldStates(): void {
    const states = this.getAllStates();
    const stateEntries = Object.entries(states);

    const sortedByDate = stateEntries.sort((a, b) => b[1].lastModified - a[1].lastModified);
    const recentStates = Object.fromEntries(sortedByDate.slice(0, Math.floor(this.MAX_STORAGE_ITEMS / 2)));

    this.saveAllStates(recentStates);
  }

  getReadArticleIds(): string[] {
    const states = this.getAllStates();
    return Object.entries(states)
      .filter(([_, state]) => state.isRead)
      .map(([id]) => id);
  }

  getBookmarkedArticleIds(): string[] {
    const states = this.getAllStates();
    return Object.entries(states)
      .filter(([_, state]) => state.isBookmarked)
      .map(([id]) => id);
  }

  getReadLaterArticleIds(): string[] {
    const states = this.getAllStates();
    return Object.entries(states)
      .filter(([_, state]) => state.isReadLater)
      .map(([id]) => id);
  }

  getSkippedArticleIds(): string[] {
    const states = this.getAllStates();
    return Object.entries(states)
      .filter(([_, state]) => state.isSkipped)
      .map(([id]) => id);
  }

  getStorageSize(): number {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }

  getStorageInfo(): { count: number; size: number } {
    const states = this.getAllStates();
    return {
      count: Object.keys(states).length,
      size: this.getStorageSize()
    };
  }

  // External Articles Management
  saveExternalArticle(article: ExternalArticle): void {
    const articles = this.getAllExternalArticles();
    articles[article.id] = article;
    this.saveAllExternalArticles(articles);
  }

  getExternalArticle(id: string): ExternalArticle | null {
    const articles = this.getAllExternalArticles();
    return articles[id] || null;
  }

  getAllExternalArticles(): Record<string, ExternalArticle> {
    try {
      const data = localStorage.getItem(this.EXTERNAL_ARTICLES_KEY);
      if (!data) return {};

      const parsed = JSON.parse(data);
      // Convert date strings back to Date objects
      Object.values(parsed).forEach((article: any) => {
        if (article.addedAt) {
          article.addedAt = new Date(article.addedAt);
        }
      });

      return parsed as Record<string, ExternalArticle>;
    } catch (error) {
      console.error('Error reading external articles from localStorage:', error);
      return {};
    }
  }

  saveAllExternalArticles(articles: Record<string, ExternalArticle>): void {
    try {
      localStorage.setItem(this.EXTERNAL_ARTICLES_KEY, JSON.stringify(articles));
    } catch (error) {
      console.error('Error saving external articles to localStorage:', error);
    }
  }

  removeExternalArticle(id: string): void {
    const articles = this.getAllExternalArticles();
    delete articles[id];
    this.saveAllExternalArticles(articles);
  }

  clearAllExternalArticles(): void {
    try {
      localStorage.removeItem(this.EXTERNAL_ARTICLES_KEY);
    } catch (error) {
      console.error('Error clearing external articles:', error);
    }
  }

  getExternalArticlesList(): ExternalArticle[] {
    const articles = this.getAllExternalArticles();
    return Object.values(articles).sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  }
}
