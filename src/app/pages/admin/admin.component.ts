import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';

interface NewsSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastUpdated: Date;
}

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
    NzToolTipModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  sources = signal<NewsSource[]>([
    {
      id: '1',
      name: 'TechCrunch',
      url: 'https://techcrunch.com/feed/',
      enabled: true,
      lastUpdated: new Date('2025-11-12T10:30:00')
    },
    {
      id: '2',
      name: 'The Verge',
      url: 'https://www.theverge.com/rss/index.xml',
      enabled: true,
      lastUpdated: new Date('2025-11-12T09:15:00')
    },
    {
      id: '3',
      name: 'Hacker News',
      url: 'https://news.ycombinator.com/rss',
      enabled: false,
      lastUpdated: new Date('2025-11-11T18:45:00')
    }
  ]);

  isModalVisible = signal(false);
  isEditMode = signal(false);
  currentSource = signal<Partial<NewsSource>>({});

  sourceName = signal('');
  sourceUrl = signal('');
  sourceEnabled = signal(true);

  constructor(private message: NzMessageService) {}

  showAddModal(): void {
    this.isEditMode.set(false);
    this.sourceName.set('');
    this.sourceUrl.set('');
    this.sourceEnabled.set(true);
    this.isModalVisible.set(true);
  }

  showEditModal(source: NewsSource): void {
    this.isEditMode.set(true);
    this.currentSource.set(source);
    this.sourceName.set(source.name);
    this.sourceUrl.set(source.url);
    this.sourceEnabled.set(source.enabled);
    this.isModalVisible.set(true);
  }

  handleCancel(): void {
    this.isModalVisible.set(false);
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
      const currentSources = this.sources();
      const sourceId = this.currentSource().id!;
      const updatedSources = currentSources.map(s =>
        s.id === sourceId
          ? { ...s, name, url, enabled, lastUpdated: new Date() }
          : s
      );
      this.sources.set(updatedSources);
      this.message.success('Source updated successfully');
    } else {
      const newSource: NewsSource = {
        id: Date.now().toString(),
        name,
        url,
        enabled,
        lastUpdated: new Date()
      };
      this.sources.set([...this.sources(), newSource]);
      this.message.success('Source added successfully');
    }

    this.isModalVisible.set(false);
  }

  toggleSource(source: NewsSource): void {
    const currentSources = this.sources();
    const updatedSources = currentSources.map(s =>
      s.id === source.id ? { ...s, enabled: !s.enabled } : s
    );
    this.sources.set(updatedSources);
    this.message.success(
      `Source ${!source.enabled ? 'enabled' : 'disabled'} successfully`
    );
  }

  deleteSource(source: NewsSource): void {
    const currentSources = this.sources();
    const updatedSources = currentSources.filter(s => s.id !== source.id);
    this.sources.set(updatedSources);
    this.message.success('Source deleted successfully');
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
