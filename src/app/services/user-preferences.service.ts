import { Injectable, signal } from '@angular/core';
import { SortOrder } from './news.service';

export type ViewMode = 'grid' | 'list';

export interface UserPreferences {
  viewMode: ViewMode;
  sortOrder: SortOrder;
  lastModified: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY = 'chronicle-user-preferences';

  viewMode = signal<ViewMode>('grid');
  sortOrder = signal<SortOrder>('desc');

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return;

      const preferences = JSON.parse(data) as UserPreferences;
      this.viewMode.set(preferences.viewMode);
      this.sortOrder.set(preferences.sortOrder);
    } catch (error) {
      console.error('Error loading user preferences from localStorage:', error);
    }
  }

  private savePreferences(): void {
    try {
      const preferences: UserPreferences = {
        viewMode: this.viewMode(),
        sortOrder: this.sortOrder(),
        lastModified: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences to localStorage:', error);
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.savePreferences();
  }

  setSortOrder(order: SortOrder): void {
    this.sortOrder.set(order);
    this.savePreferences();
  }

  toggleViewMode(): void {
    const newMode = this.viewMode() === 'grid' ? 'list' : 'grid';
    this.setViewMode(newMode);
  }

  toggleSortOrder(): void {
    const newOrder = this.sortOrder() === 'desc' ? 'asc' : 'desc';
    this.setSortOrder(newOrder);
  }

  getPreferences(): UserPreferences {
    return {
      viewMode: this.viewMode(),
      sortOrder: this.sortOrder(),
      lastModified: Date.now()
    };
  }

  resetPreferences(): void {
    this.viewMode.set('grid');
    this.sortOrder.set('desc');
    this.savePreferences();
  }

  clearPreferences(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.viewMode.set('grid');
      this.sortOrder.set('desc');
    } catch (error) {
      console.error('Error clearing user preferences:', error);
    }
  }
}
