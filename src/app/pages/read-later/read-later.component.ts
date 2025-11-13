import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AddExternalArticleModalComponent } from '../../components/add-external-article-modal/add-external-article-modal.component';
import { NewsCardComponent } from '../../components/news-card/news-card.component';
import { ExternalArticle } from '../../models/external-article.interface';
import { NewsArticle } from '../../models/news-article.interface';
import { ArticlePersistenceService } from '../../services/article-persistence.service';
import { MetadataExtractionService } from '../../services/metadata-extraction.service';
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
  private persistenceService = inject(ArticlePersistenceService);
  private metadataService = inject(MetadataExtractionService);
  private preferencesService = inject(UserPreferencesService);
  private message = inject(NzMessageService);
  private router = inject(Router);

  addModal = viewChild.required(AddExternalArticleModalComponent);

  // URL input state (keeping for backward compatibility, but will be replaced by modal)
  protected urlInput = signal('');
  protected isAddingUrl = signal(false);
  protected urlError = signal('');
  protected urlSuccess = signal('');

  // Internal articles from news feed
  protected internalReadLaterArticles = computed(() => {
    const articles = this.newsService
      .articles$()
      .filter((article) => article.isReadLater && !article.isSkipped && !article.isExternal);
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

  // External articles from localStorage
  protected externalArticles = signal<ExternalArticle[]>([]);

  // Convert external articles to NewsArticle format for display with search filtering
  protected externalArticlesAsNews = computed(() => {
    const external = this.externalArticles();
    const query = this.newsService.searchQuery().toLowerCase().trim();

    // Only show external articles that are marked as read later
    const readLaterExternal = external.filter(ext => ext.isReadLater !== false);

    const converted = readLaterExternal.map((ext) => ({
      id: ext.id,
      title: ext.title,
      description: ext.description || '',
      url: ext.url,
      imageUrl: ext.imageUrl || '',
      publishedAt: ext.addedAt,
      sourceName: ext.sourceName || 'External Source',
      isRead: ext.isRead || false,
      isBookmarked: ext.isBookmarked || false,
      isReadLater: ext.isReadLater !== false,
      isSkipped: false,
      isExternal: true,
    }));

    if (!query) {
      return converted;
    }

    return converted.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query)
    );
  });

  // Combined articles list (kept for total count)
  protected readLaterArticles = computed(() => {
    return [...this.externalArticlesAsNews(), ...this.internalReadLaterArticles()];
  });

  protected readLaterCount = computed(() => this.readLaterArticles().length);

  // Use global view mode preference
  protected viewMode = this.preferencesService.viewMode;

  constructor() {
    this.loadExternalArticles();
  }

  private loadExternalArticles(): void {
    const articles = this.persistenceService.getExternalArticlesList();
    this.externalArticles.set(articles);
  }

  private notifyExternalArticlesChanged(): void {
    // Dispatch a custom event that the App component can listen to
    window.dispatchEvent(new CustomEvent('external-articles-changed'));
  }

  protected onAddUrl(): void {
    const url = this.urlInput().trim();

    // Clear previous messages
    this.urlError.set('');
    this.urlSuccess.set('');

    if (!url) {
      return;
    }

    // Validate URL
    if (!this.metadataService.validateUrl(url)) {
      this.urlError.set('Please enter a valid URL (http:// or https://)');
      return;
    }

    // Check if URL already exists
    const existing = this.externalArticles().find((a) => a.url === url);
    if (existing) {
      this.urlError.set('This URL is already in your Read Later list');
      return;
    }

    this.isAddingUrl.set(true);

    // Fetch metadata
    this.metadataService.fetchMetadata(url).subscribe({
      next: (metadata) => {
        const externalArticle: ExternalArticle = {
          id: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: metadata.url,
          title: metadata.title || 'External Article',
          description: metadata.description,
          imageUrl: metadata.imageUrl,
          sourceName: metadata.sourceName,
          addedAt: new Date(),
          isExternal: true,
        };

        // Save to localStorage
        this.persistenceService.saveExternalArticle(externalArticle);

        // Update display
        this.loadExternalArticles();

        // Notify other components about the change
        this.notifyExternalArticlesChanged();

        // Clear input and show success
        this.urlInput.set('');
        this.urlSuccess.set('Article added to Read Later!');
        this.isAddingUrl.set(false);

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.urlSuccess.set('');
        }, 3000);
      },
      error: (error) => {
        console.error('Error fetching metadata:', error);
        this.urlError.set('Failed to fetch article information. Please try again.');
        this.isAddingUrl.set(false);
      },
    });
  }

  protected openAddModal(): void {
    this.addModal().open();
  }

  protected onArticleAdded(article: ExternalArticle): void {
    // Save to localStorage
    this.persistenceService.saveExternalArticle(article);

    // Update display
    this.loadExternalArticles();

    // Notify other components about the change
    this.notifyExternalArticlesChanged();
  }

  protected onCardClick(article: NewsArticle): void {
    window.open(article.url, '_blank');

    // Mark article as read
    if (article.isExternal) {
      // Mark external article as read
      this.markExternalArticleAsRead(article.id);
    } else {
      // Mark internal article as read
      this.newsService.markAsRead(article.id);
    }
  }

  private markExternalArticleAsRead(articleId: string): void {
    const articles = this.externalArticles();
    const article = articles.find((a) => a.id === articleId);

    if (article && !article.isRead) {
      const updatedArticle = { ...article, isRead: true };
      this.persistenceService.saveExternalArticle(updatedArticle);
      this.loadExternalArticles();
    }
  }

  protected onBookmarkToggle(article: NewsArticle): void {
    if (article.isExternal) {
      // Toggle bookmark for external article
      this.toggleExternalArticleBookmark(article.id);
    } else {
      // Toggle bookmark for internal article
      this.newsService.toggleBookmark(article.id);
    }
  }

  private toggleExternalArticleBookmark(articleId: string): void {
    const articles = this.externalArticles();
    const article = articles.find((a) => a.id === articleId);

    if (article) {
      const updatedArticle = { ...article, isBookmarked: !article.isBookmarked };

      // If article is not bookmarked and not in read later, remove it from storage
      if (!updatedArticle.isBookmarked && !updatedArticle.isReadLater) {
        this.persistenceService.removeExternalArticle(articleId);
      } else {
        this.persistenceService.saveExternalArticle(updatedArticle);
      }

      this.loadExternalArticles();
      // Notify news service to refresh external articles in main feed
      this.newsService.refreshExternalArticles();
    }
  }

  protected onReadLaterToggle(article: NewsArticle): void {
    // Check if it's an external article
    if (article.isExternal) {
      const articles = this.externalArticles();
      const externalArticle = articles.find((a) => a.id === article.id);

      if (externalArticle) {
        const updatedArticle = { ...externalArticle, isReadLater: false };

        // If article is not bookmarked and not in read later, remove it from storage
        if (!updatedArticle.isBookmarked && !updatedArticle.isReadLater) {
          this.persistenceService.removeExternalArticle(article.id);
        } else {
          this.persistenceService.saveExternalArticle(updatedArticle);
        }

        this.loadExternalArticles();
        this.notifyExternalArticlesChanged();
        this.newsService.refreshExternalArticles();
      }
    } else {
      // Toggle internal article
      this.newsService.toggleReadLater(article.id);
    }
  }

  protected onMarkRead(article: NewsArticle): void {
    if (article.isExternal) {
      // Mark external article as read
      this.markExternalArticleAsRead(article.id);
    } else {
      // Mark internal article as read
      this.newsService.markAsRead(article.id);
    }
  }

  protected onMarkUnread(article: NewsArticle): void {
    if (article.isExternal) {
      // Mark external article as unread
      this.markExternalArticleAsUnread(article.id);
    } else {
      // Mark internal article as unread
      this.newsService.toggleReadStatus(article.id);
    }
  }

  private markExternalArticleAsUnread(articleId: string): void {
    const articles = this.externalArticles();
    const article = articles.find((a) => a.id === articleId);

    if (article && article.isRead) {
      const updatedArticle = { ...article, isRead: false };
      this.persistenceService.saveExternalArticle(updatedArticle);
      this.loadExternalArticles();
    }
  }

  protected onSkip(article: NewsArticle): void {
    // For external articles, remove them
    if (article.isExternal) {
      this.persistenceService.removeExternalArticle(article.id);
      this.loadExternalArticles();
      this.notifyExternalArticlesChanged();
    } else {
      // Skip internal article
      this.newsService.skipArticle(article.id);
    }
  }

  protected onUndoSkip(article: NewsArticle): void {
    // Only undo skip for internal articles
    if (!article.isExternal) {
      this.newsService.undoSkip(article.id);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/']);
  }

  protected clearExternalArticles(): void {
    const articles = this.externalArticles();

    articles.forEach(article => {
      // Check if article is bookmarked before removing from read later
      if (article.isBookmarked === true) {
        // Keep bookmarked articles but mark as not in read later
        const updatedArticle = { ...article, isReadLater: false };
        this.persistenceService.saveExternalArticle(updatedArticle);
      } else {
        // Remove non-bookmarked articles from storage entirely
        this.persistenceService.removeExternalArticle(article.id);
      }
    });

    this.loadExternalArticles();
    this.notifyExternalArticlesChanged();
    this.newsService.refreshExternalArticles();
  }

  protected clearInternalArticles(): void {
    const internalArticles = this.internalReadLaterArticles();
    internalArticles.forEach((article) => {
      this.newsService.toggleReadLater(article.id);
    });
  }

  protected clearAllReadLater(): void {
    this.clearInternalArticles();
    this.clearExternalArticles();
  }
}
