import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NewsCardComponent } from '../../components/news-card/news-card.component';
import { NewsArticle } from '../../models/news-article.interface';
import { NewsService } from '../../services/news.service';
import { MenuAction } from '../../components/article-menu/article-menu.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-read-later',
  standalone: true,
  imports: [CommonModule, NewsCardComponent, NzButtonModule, NzIconModule],
  templateUrl: './read-later.component.html',
  styleUrl: './read-later.component.scss'
})
export class ReadLaterComponent {
  private newsService = inject(NewsService);
  private router = inject(Router);

  protected readLaterArticles = computed(() => {
    return this.newsService.articles$().filter(article => article.isReadLater && !article.isSkipped);
  });

  protected readLaterCount = computed(() => this.readLaterArticles().length);

  // Always use grid view for read later page
  protected viewMode = () => 'grid' as const;

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

  protected goBack(): void {
    this.router.navigate(['/']);
  }

  protected clearAllReadLater(): void {
    const articles = this.readLaterArticles();
    articles.forEach(article => {
      this.newsService.toggleReadLater(article.id);
    });
  }
}
