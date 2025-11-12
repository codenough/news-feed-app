import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsCardComponent } from './components/news-card/news-card.component';
import { ThemeToggleComponent } from './components/theme-toggle.component';
import { NewsArticle } from './models/news-article.interface';
import { NewsService, SortOrder } from './services/news.service';
import { UserPreferencesService, FilterType } from './services/user-preferences.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { MenuAction } from './components/article-menu/article-menu.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, NewsCardComponent, ThemeToggleComponent, NzIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Chronicle News Feed');

  private newsService = inject(NewsService);
  private preferencesService = inject(UserPreferencesService);

  protected viewMode = this.preferencesService.viewMode;
  protected sortOrder = this.preferencesService.sortOrder;
  protected currentFilter = this.preferencesService.currentFilter;
  protected searchQuery = this.newsService.searchQuery;

  protected articles = this.newsService.articles$;

  protected isLoading = this.newsService.isLoading;
  protected error = this.newsService.error;
  protected lastFetchTimestamp = this.newsService.lastFetchTimestamp;

  ngOnInit(): void {
    this.newsService.setSortOrder(this.sortOrder());
    this.newsService.setFilter(this.currentFilter());
    this.newsService.loadMockData();
  }

  protected onFilterChange(filter: FilterType): void {
    this.preferencesService.setFilter(filter);
    this.newsService.setFilter(filter);
  }

  protected onRefresh(): void {
    this.newsService.loadMockData();
  }

  protected onSortChange(order: SortOrder): void {
    this.preferencesService.setSortOrder(order);
    this.newsService.setSortOrder(order);
    this.newsService.loadMockData();
  }

  protected toggleSort(): void {
    this.preferencesService.toggleSortOrder();
    this.newsService.setSortOrder(this.sortOrder());
    this.newsService.loadMockData();
  }

  protected onCardClick(article: NewsArticle): void {
    window.open(article.url, '_blank');
    this.newsService.markAsRead(article.id);
  }

  protected onBookmarkToggle(article: NewsArticle): void {
    this.newsService.toggleBookmark(article.id);
  }

  protected onReadLaterToggle(article: NewsArticle): void {
    this.newsService.toggleReadLater(article.id);
  }

  protected onMenuAction(action: MenuAction): void {
    switch (action.type) {
      case 'mark-read':
        this.newsService.markAsRead(action.article.id);
        break;
      case 'mark-unread':
        this.newsService.toggleReadStatus(action.article.id);
        break;
      case 'skip':
        this.newsService.skipArticle(action.article.id);
        break;
      case 'undo-skip':
        this.newsService.undoSkip(action.article.id);
        break;
    }
  }

  protected toggleViewMode(): void {
    this.preferencesService.toggleViewMode();
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newsService.setSearchQuery(input.value);
  }

  protected onSearchClear(): void {
    this.newsService.setSearchQuery('');
  }

  protected onClearFilters(): void {
    this.newsService.setSearchQuery('');
    this.onFilterChange('all');
  }

  protected getFormattedTimestamp(): string {
    const timestamp = this.lastFetchTimestamp();
    if (!timestamp) return '';

    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}
