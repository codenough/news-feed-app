import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NewsArticle } from '../../models/news-article.interface';

export interface MenuAction {
  type: 'mark-read' | 'mark-unread' | 'skip' | 'undo-skip';
  article: NewsArticle;
}

@Component({
  selector: 'app-article-menu',
  standalone: true,
  imports: [CommonModule, NzDropDownModule, NzIconModule],
  templateUrl: './article-menu.component.html',
  styleUrl: './article-menu.component.scss'
})
export class ArticleMenuComponent {
  @Input({ required: true }) article!: NewsArticle;
  @Output() menuAction = new EventEmitter<MenuAction>();

  onMarkRead(): void {
    this.menuAction.emit({ type: 'mark-read', article: this.article });
  }

  onMarkUnread(): void {
    this.menuAction.emit({ type: 'mark-unread', article: this.article });
  }

  onSkip(): void {
    this.menuAction.emit({ type: 'skip', article: this.article });
  }

  onUndoSkip(): void {
    this.menuAction.emit({ type: 'undo-skip', article: this.article });
  }
}
