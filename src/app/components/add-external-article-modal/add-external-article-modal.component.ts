import { Component, signal, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NewsCardComponent } from '../news-card/news-card.component';
import { MetadataExtractionService } from '../../services/metadata-extraction.service';
import { ExternalArticle } from '../../models/external-article.interface';

@Component({
  selector: 'app-add-external-article-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NewsCardComponent
  ],
  templateUrl: './add-external-article-modal.component.html',
  styleUrl: './add-external-article-modal.component.scss'
})
export class AddExternalArticleModalComponent {
  private metadataService = inject(MetadataExtractionService);

  articleAdded = output<ExternalArticle>();

  isVisible = signal(false);
  isLoading = signal(false);
  urlInput = signal('');
  titleInput = signal('');
  descriptionInput = signal('');
  imageUrlInput = signal('');
  sourceInput = signal('');
  urlError = signal('');

  previewArticle = computed(() => {
    if (!this.titleInput() && !this.urlInput()) {
      return null;
    }

    return {
      id: 'preview',
      title: this.titleInput() || 'Preview Title',
      description: this.descriptionInput() || 'Preview description will appear here',
      url: this.urlInput() || '#',
      imageUrl: this.imageUrlInput() || '',
      publishedAt: new Date(),
      sourceName: this.sourceInput() || 'External Source',
      isRead: false,
      isBookmarked: false,
      isReadLater: true,
      isSkipped: false
    };
  });

  canSubmit = computed(() => {
    return this.urlInput().trim() !== '' &&
           this.titleInput().trim() !== '' &&
           !this.isLoading();
  });

  open(): void {
    this.resetForm();
    this.isVisible.set(true);
  }

  close(): void {
    this.isVisible.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.urlInput.set('');
    this.titleInput.set('');
    this.descriptionInput.set('');
    this.imageUrlInput.set('');
    this.sourceInput.set('');
    this.urlError.set('');
    this.isLoading.set(false);
  }

  async onUrlBlur(): Promise<void> {
    const url = this.urlInput().trim();

    if (!url) {
      return;
    }

    if (!this.metadataService.validateUrl(url)) {
      this.urlError.set('Please enter a valid URL (http:// or https://)');
      return;
    }

    this.urlError.set('');

    if (this.titleInput() || this.descriptionInput()) {
      return;
    }

    this.isLoading.set(true);

    this.metadataService.fetchMetadata(url).subscribe({
      next: (metadata) => {
        if (metadata.title) {
          this.titleInput.set(metadata.title);
        }
        if (metadata.description) {
          this.descriptionInput.set(metadata.description);
        }
        if (metadata.imageUrl) {
          this.imageUrlInput.set(metadata.imageUrl);
        }
        if (metadata.sourceName) {
          this.sourceInput.set(metadata.sourceName);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching metadata:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const article: ExternalArticle = {
      id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: this.urlInput().trim(),
      title: this.titleInput().trim(),
      description: this.descriptionInput().trim(),
      imageUrl: this.imageUrlInput().trim(),
      sourceName: this.sourceInput().trim() || 'External Source',
      addedAt: new Date(),
      isExternal: true,
      isReadLater: true,
      isBookmarked: false,
      isRead: false
    };

    this.articleAdded.emit(article);
    this.close();
  }
}
