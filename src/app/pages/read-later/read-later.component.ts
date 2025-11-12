import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NewsCardComponent } from '../../components/news-card/news-card.component';
import { NewsArticle } from '../../models/news-article.interface';
import { ExternalArticle } from '../../models/external-article.interface';
import { NewsService } from '../../services/news.service';
import { ArticlePersistenceService } from '../../services/article-persistence.service';
import { MetadataExtractionService } from '../../services/metadata-extraction.service';
import { MenuAction } from '../../components/article-menu/article-menu.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-read-later',
  standalone: true,
  imports: [CommonModule, FormsModule, NewsCardComponent, NzButtonModule, NzIconModule, NzInputModule],
  templateUrl: './read-later.component.html',
  styleUrl: './read-later.component.scss'
})
export class ReadLaterComponent {
  private newsService = inject(NewsService);
  private persistenceService = inject(ArticlePersistenceService);
  private metadataService = inject(MetadataExtractionService);
  private router = inject(Router);

  // URL input state
  protected urlInput = signal('');
  protected isAddingUrl = signal(false);
  protected urlError = signal('');
  protected urlSuccess = signal('');

  // Internal articles from news feed
  protected internalReadLaterArticles = computed(() => {
    return this.newsService.articles$().filter(article => article.isReadLater && !article.isSkipped);
  });

  // External articles from localStorage
  protected externalArticles = signal<ExternalArticle[]>([]);

  // Combined articles list
  protected readLaterArticles = computed(() => {
    const internal = this.internalReadLaterArticles();
    const external = this.externalArticles();

    // Convert external articles to NewsArticle format for display
    const externalAsNews: NewsArticle[] = external.map(ext => ({
      id: ext.id,
      title: ext.title,
      description: ext.description || '',
      url: ext.url,
      imageUrl: ext.imageUrl || '',
      publishedAt: ext.addedAt,
      sourceName: ext.sourceName || 'External Source',
      isRead: false,
      isBookmarked: false,
      isReadLater: true,
      isSkipped: false
    }));

    return [...externalAsNews, ...internal];
  });

  protected readLaterCount = computed(() => this.readLaterArticles().length);

  // Always use grid view for read later page
  protected viewMode = () => 'grid' as const;

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
    const existing = this.externalArticles().find(a => a.url === url);
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
          isExternal: true
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
      }
    });
  }

  protected onCardClick(article: NewsArticle): void {
    window.open(article.url, '_blank');
    // Only mark internal articles as read
    if (!article.id.startsWith('ext_')) {
      this.newsService.markAsRead(article.id);
    }
  }

  protected onBookmarkToggle(article: NewsArticle): void {
    // Only bookmark internal articles
    if (!article.id.startsWith('ext_')) {
      this.newsService.toggleBookmark(article.id);
    }
  }

  protected onReadLaterToggle(article: NewsArticle): void {
    // Check if it's an external article
    if (article.id.startsWith('ext_')) {
      // Remove from external articles
      this.persistenceService.removeExternalArticle(article.id);
      this.loadExternalArticles();
      this.notifyExternalArticlesChanged();
    } else {
      // Toggle internal article
      this.newsService.toggleReadLater(article.id);
    }
  }

  protected onMenuAction(action: MenuAction): void {
    // External articles don't support all menu actions
    if (action.article.id.startsWith('ext_')) {
      // Only allow removing from read later for external articles
      if (action.type === 'skip') {
        this.persistenceService.removeExternalArticle(action.article.id);
        this.loadExternalArticles();
        this.notifyExternalArticlesChanged();
      }
      return;
    }

    // Handle internal article menu actions
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

  protected goBack(): void {
    this.router.navigate(['/']);
  }

  protected clearAllReadLater(): void {
    // Clear internal articles
    const internalArticles = this.internalReadLaterArticles();
    internalArticles.forEach(article => {
      this.newsService.toggleReadLater(article.id);
    });

    // Clear external articles
    this.persistenceService.clearAllExternalArticles();
    this.loadExternalArticles();
    this.notifyExternalArticlesChanged();
  }
}
