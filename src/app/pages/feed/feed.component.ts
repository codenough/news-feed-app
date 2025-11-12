import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsCardComponent } from '../../components/news-card/news-card.component';
import { NewsArticle } from '../../models/news-article.interface';
import { NewsService } from '../../services/news.service';
import { UserPreferencesService, FilterType } from '../../services/user-preferences.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { MenuAction } from '../../components/article-menu/article-menu.component';

@Component({
  selector: 'app-feed',
  imports: [
    CommonModule,
    FormsModule,
    NewsCardComponent,
    NzIconModule,
    NzButtonModule
  ],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss'
})
export class FeedComponent {
  private newsService = inject(NewsService);
  private preferencesService = inject(UserPreferencesService);

  protected viewMode = this.preferencesService.viewMode;
  protected currentFilter = this.preferencesService.currentFilter;
  protected searchQuery = this.newsService.searchQuery;
  protected selectedSource = this.newsService.selectedSource;

  protected articles = this.newsService.articles$;
  protected isLoading = this.newsService.isLoading;
  protected error = this.newsService.error;

  protected onCardClick(article: NewsArticle): void {
    this.newsService.markAsRead(article.id);
    window.open(article.url, '_blank', 'noopener,noreferrer');
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

  protected onClearFilters(): void {
    this.preferencesService.setFilter('all');
    this.newsService.setSearchQuery('');
    this.newsService.setSelectedSource(null);
  }

  protected onRefresh(): void {
    this.newsService.loadMockData();
  }
}
