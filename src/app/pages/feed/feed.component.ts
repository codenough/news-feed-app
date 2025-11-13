import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsCardComponent } from '../../components/news-card/news-card.component';
import { NewsArticle } from '../../models/news-article.interface';
import { NewsService } from '../../services/news.service';
import { UserPreferencesService, FilterType } from '../../services/user-preferences.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzBadgeModule } from 'ng-zorro-antd/badge';

interface ArticleGroup {
  date: Date;
  label: string;
  articles: NewsArticle[];
  unreadCount: number;
}

@Component({
  selector: 'app-feed',
  imports: [
    CommonModule,
    FormsModule,
    NewsCardComponent,
    NzIconModule,
    NzButtonModule,
    NzBadgeModule
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

  // Group articles by date
  protected articleGroups = computed(() => {
    return this.groupArticlesByDate(this.articles());
  });

  private groupArticlesByDate(articles: NewsArticle[]): ArticleGroup[] {
    const groups = new Map<string, ArticleGroup>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    articles.forEach(article => {
      const articleDate = new Date(article.publishedAt);
      articleDate.setHours(0, 0, 0, 0);

      const dateKey = articleDate.toISOString().split('T')[0];

      if (!groups.has(dateKey)) {
        let label: string;

        if (articleDate.getTime() === today.getTime()) {
          label = 'Today';
        } else if (articleDate.getTime() === yesterday.getTime()) {
          label = 'Yesterday';
        } else {
          // Format as "25 October 2025"
          label = articleDate.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        }

        groups.set(dateKey, {
          date: articleDate,
          label,
          articles: [],
          unreadCount: 0
        });
      }

      const group = groups.get(dateKey)!;
      group.articles.push(article);
      if (!article.isRead) {
        group.unreadCount++;
      }
    });

    // Convert to array and sort by date (newest first)
    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

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

  protected onMarkRead(article: NewsArticle): void {
    this.newsService.markAsRead(article.id);
  }

  protected onMarkUnread(article: NewsArticle): void {
    this.newsService.toggleReadStatus(article.id);
  }

  protected onSkip(article: NewsArticle): void {
    this.newsService.skipArticle(article.id);
  }

  protected onUndoSkip(article: NewsArticle): void {
    this.newsService.undoSkip(article.id);
  }

  protected onClearFilters(): void {
    this.preferencesService.setFilter('all');
    this.newsService.setSearchQuery('');
    this.newsService.setSelectedSource(null);
  }

  protected onRefresh(): void {
    this.newsService.loadFromRSSFeeds();
  }
}
