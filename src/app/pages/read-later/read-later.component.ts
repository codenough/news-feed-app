import { CommonModule } from '@angular/common';
import { Component, computed, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AddExternalArticleModalComponent } from '../../components/add-external-article-modal/add-external-article-modal.component';
import { NewsCardComponent } from '../../components/news-card/news-card.component';
import { ExternalArticle } from '../../models/external-article.interface';
import { NewsArticle } from '../../models/news-article.interface';
import { NewsService } from '../../services/news.service';
import { UserPreferencesService } from '../../services/user-preferences.service';

@Component({
  selector: 'app-read-later',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NewsCardComponent,
    AddExternalArticleModalComponent,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzBadgeModule,
  ],
  templateUrl: './read-later.component.html',
  styleUrl: './read-later.component.scss',
})
export class ReadLaterComponent {
  private newsService = inject(NewsService);
  private preferencesService = inject(UserPreferencesService);
  private router = inject(Router);

  addModal = viewChild.required(AddExternalArticleModalComponent);

  // All read later articles from news feed (both internal and external)
  protected readLaterArticles = computed(() => {
    const articles = this.newsService
      .articles$()
      .filter((article) => article.isReadLater && !article.isSkipped);
    const query = this.newsService.searchQuery().toLowerCase().trim();

    if (!query) {
      return articles;
    }

    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query)
    );
  });

  protected readLaterCount = computed(() => this.readLaterArticles().length);

  // Use global view mode preference
  protected viewMode = this.preferencesService.viewMode;

  protected openAddModal(): void {
    this.addModal().open();
  }

  protected onArticleAdded(article: ExternalArticle): void {
    // Add article directly to the main articles list
    this.newsService.addExternalArticle(article);
  }

  protected onCardClick(article: NewsArticle): void {
    window.open(article.url, '_blank');
    // Mark article as read - unified for all article types
    this.newsService.markAsRead(article.id);
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

  protected goBack(): void {
    this.router.navigate(['/']);
  }

  protected clearAllReadLater(): void {
    const articles = this.readLaterArticles();
    articles.forEach((article) => {
      this.newsService.toggleReadLater(article.id);
    });
  }
}
