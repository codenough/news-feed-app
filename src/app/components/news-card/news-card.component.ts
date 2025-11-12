import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsArticle } from '../../models/news-article.interface';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news-card.component.html',
  styleUrl: './news-card.component.scss'
})
export class NewsCardComponent {
  @Input({ required: true }) article!: NewsArticle;
  @Input() viewMode: 'grid' | 'list' = 'grid';

  @Output() cardClick = new EventEmitter<NewsArticle>();
  @Output() bookmarkToggle = new EventEmitter<NewsArticle>();
  @Output() readLaterToggle = new EventEmitter<NewsArticle>();
  @Output() menuClick = new EventEmitter<NewsArticle>();

  onCardClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.card-actions')) {
      this.cardClick.emit(this.article);
    }
  }

  onBookmarkClick(event: Event): void {
    event.stopPropagation();
    this.bookmarkToggle.emit(this.article);
  }

  onReadLaterClick(event: Event): void {
    event.stopPropagation();
    this.readLaterToggle.emit(this.article);
  }

  onMenuClick(event: Event): void {
    event.stopPropagation();
    this.menuClick.emit(this.article);
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const publishedDate = new Date(date);
    const diffInMs = now.getTime() - publishedDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return publishedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: publishedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }
}
