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
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SourceManagementService, NewsSource } from '../../services/source-management.service';

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
  private sourceManagementService = inject(SourceManagementService);
  private message = inject(NzMessageService);

  sources = this.sourceManagementService.sources;

  isModalVisible = signal(false);
  isEditMode = signal(false);
  currentSource = signal<Partial<NewsSource>>({});

  sourceName = signal('');
  sourceUrl = signal('');
  sourceEnabled = signal(true);

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
      this.message.success(
        `Source ${!source.enabled ? 'enabled' : 'disabled'} successfully`
      );
    } else {
      this.message.error('Failed to toggle source');
    }
  }

  deleteSource(source: NewsSource): void {
    const success = this.sourceManagementService.deleteSource(source.id);
    if (success) {
      this.message.success('Source deleted successfully');
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
