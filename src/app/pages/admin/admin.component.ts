import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { SourceManagementService, NewsSource } from '../../services/source-management.service';
import { RssParserService } from '../../services/rss-parser.service';
import { NewsService } from '../../services/news.service';
import { NewsArticle } from '../../models/news-article.interface';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzButtonModule,
    NzIconModule,
    NzTableModule,
    NzModalModule,
    NzInputModule,
    NzSwitchModule,
    NzTooltipModule,
    NzSpinModule,
    NzAlertModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private sourceManagementService = inject(SourceManagementService);
  private rssParserService = inject(RssParserService);
  private newsService = inject(NewsService);
  private message = inject(NzMessageService);

  sources = this.sourceManagementService.sources;

  isModalVisible = signal(false);
  isEditMode = signal(false);
  currentSource = signal<Partial<NewsSource>>({});

  sourceName = signal('');
  sourceUrl = signal('');
  sourceEnabled = signal(true);

  isTesting = signal(false);
  testResult = signal<{ success: boolean; articles?: NewsArticle[]; error?: string } | null>(null);
  showTestResults = signal(false);

  showAddModal(): void {
    this.isEditMode.set(false);
    this.sourceName.set('');
    this.sourceUrl.set('');
    this.sourceEnabled.set(true);
    this.testResult.set(null);
    this.showTestResults.set(false);
    this.isModalVisible.set(true);
  }

  showEditModal(source: NewsSource): void {
    this.isEditMode.set(true);
    this.currentSource.set(source);
    this.sourceName.set(source.name);
    this.sourceUrl.set(source.url);
    this.sourceEnabled.set(source.enabled);
    this.testResult.set(null);
    this.showTestResults.set(false);
    this.isModalVisible.set(true);
  }

  handleCancel(): void {
    this.isModalVisible.set(false);
    this.testResult.set(null);
    this.showTestResults.set(false);
  }

  async testFetch(): Promise<void> {
    const url = this.sourceUrl();

    if (!url) {
      this.message.warning('Please enter a feed URL first');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.message.error('Please enter a valid URL');
      return;
    }

    this.isTesting.set(true);
    this.testResult.set(null);
    this.showTestResults.set(false);

    this.rssParserService.fetchAndParseRSS(url, this.sourceName() || 'Test Feed').subscribe({
      next: (result) => {
        if (result.articles.length > 0) {
          const previewArticles = result.articles.slice(0, 5);
          this.testResult.set({
            success: true,
            articles: previewArticles,
          });
          this.message.success(`Successfully fetched ${result.articles.length} articles`);
          this.showTestResults.set(true);
        } else {
          this.testResult.set({
            success: false,
            error: 'No articles found in the feed',
          });
          this.message.warning('Feed parsed but no articles found');
          this.showTestResults.set(true);
        }
        this.isTesting.set(false);
      },
      error: (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.testResult.set({
          success: false,
          error: errorMessage,
        });
        this.message.error('Failed to fetch feed');
        this.showTestResults.set(true);
        this.isTesting.set(false);
      },
    });
  }

  handleOk(): void {
    const name = this.sourceName();
    const url = this.sourceUrl();
    const enabled = this.sourceEnabled();

    if (!name || !url) {
      this.message.error('Please fill in all required fields');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.message.error('Please enter a valid URL');
      return;
    }

    if (this.isEditMode()) {
      const sourceId = this.currentSource().id!;
      const success = this.sourceManagementService.updateSource(sourceId, name, url, enabled);
      if (success) {
        this.message.success('Source updated successfully');
      } else {
        this.message.error('Failed to update source');
      }
    } else {
      this.sourceManagementService.addSource(name, url, enabled);
      this.message.success('Source added successfully');
    }

    this.isModalVisible.set(false);
  }

  toggleSource(source: NewsSource): void {
    const success = this.sourceManagementService.toggleSource(source.id);
    if (success) {
      this.message.success(`Source ${!source.enabled ? 'enabled' : 'disabled'} successfully`);
      // Clean up articles from disabled sources
      this.newsService.cleanupArticlesFromDisabledSources();
    } else {
      this.message.error('Failed to toggle source');
    }
  }

  deleteSource(source: NewsSource): void {
    const success = this.sourceManagementService.deleteSource(source.id);
    if (success) {
      this.message.success('Source deleted successfully');
      // Clean up articles from deleted source
      this.newsService.cleanupArticlesFromDisabledSources();
    } else {
      this.message.error('Failed to delete source');
    }
  }

  showDeleteConfirm(source: NewsSource): void {
    if (confirm(`Are you sure you want to delete "${source.name}"?`)) {
      this.deleteSource(source);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
