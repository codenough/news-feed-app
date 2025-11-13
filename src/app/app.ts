import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { ThemeToggleComponent } from './components/theme-toggle.component';
import { DateRangeFilterComponent, DateRange } from './components/date-range-filter.component';
import { NewsService, SortOrder } from './services/news.service';
import { UserPreferencesService, FilterType } from './services/user-preferences.service';
import { ArticlePersistenceService } from './services/article-persistence.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterModule,
    ThemeToggleComponent,
    DateRangeFilterComponent,
    NzIconModule,
    NzInputModule,
    NzButtonModule,
    NzBadgeModule,
    NzTooltipModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Chronicle News Feed');

  private newsService = inject(NewsService);
  private preferencesService = inject(UserPreferencesService);
  private persistenceService = inject(ArticlePersistenceService);
  private router = inject(Router);

  protected viewMode = this.preferencesService.viewMode;
  protected sortOrder = this.preferencesService.sortOrder;
  protected currentFilter = this.preferencesService.currentFilter;
  protected persistedDateRange = this.preferencesService.dateRange;
  protected searchQuery = this.newsService.searchQuery;
  protected selectedSource = this.newsService.selectedSource;
  protected sources = this.newsService.sources$;

  protected articles = this.newsService.articles$;

  protected isLoading = this.newsService.isLoading;
  protected error = this.newsService.error;
  protected lastFetchTimestamp = this.newsService.lastFetchTimestamp;

  // Signal to track external articles count for reactivity
  private externalArticlesCount = signal(0);

  ngOnInit(): void {
    this.newsService.setSortOrder(this.sortOrder());
    this.newsService.setFilter(this.currentFilter());

    const persistedRange = this.persistedDateRange();
    if (persistedRange.startDate || persistedRange.endDate) {
      this.newsService.setDateRange(persistedRange.startDate, persistedRange.endDate);
    }

    this.newsService.loadMockData();
    this.updateExternalArticlesCount();

    window.addEventListener('external-articles-changed', () => {
      this.updateExternalArticlesCount();
    });
  }

  private updateExternalArticlesCount(): void {
    const externalArticles = this.persistenceService.getExternalArticlesList();
    this.externalArticlesCount.set(externalArticles.length);
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
  }

  protected toggleSort(): void {
    this.preferencesService.toggleSortOrder();
    this.newsService.setSortOrder(this.sortOrder());
  }

  protected toggleViewMode(): void {
    this.preferencesService.toggleViewMode();
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newsService.setSearchQuery(input.value);
  }

  protected onSearchChange(value: string): void {
    this.newsService.setSearchQuery(value);
  }

  protected onSearchClear(): void {
    this.newsService.setSearchQuery('');
  }

  protected onClearFilters(): void {
    this.newsService.setSearchQuery('');
    this.newsService.setSelectedSource(null);
    this.newsService.setDateRange(null, null);
    this.preferencesService.setDateRange(null, null);
    this.onFilterChange('all');
  }

  protected onSourceSelect(sourceName: string | null): void {
    this.newsService.setSelectedSource(sourceName);
  }

  protected onDateRangeChange(range: DateRange): void {
    this.newsService.setDateRange(range.startDate, range.endDate);
    this.preferencesService.setDateRange(range.startDate, range.endDate);
  }

  protected getFormattedTimestamp(): string {
    const timestamp = this.lastFetchTimestamp();
    if (!timestamp) return '';

    return timestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  protected readLaterCount = computed(() => {
    const internalCount = this.articles().filter(article => article.isReadLater && !article.isSkipped).length;
    const externalCount = this.externalArticlesCount();
    return internalCount + externalCount;
  });

  protected navigateToReadLater(): void {
    this.router.navigate(['/read-later']);
    // Update count when navigating (in case user is coming back)
    setTimeout(() => this.updateExternalArticlesCount(), 100);
  }
}
