import { Injectable, signal } from '@angular/core';
import { SortOrder } from './news.service';

export type ViewMode = 'grid' | 'list';
export type FilterType = 'all' | 'unread' | 'read' | 'bookmarked';

export interface UserPreferences {
  viewMode: ViewMode;
  sortOrder: SortOrder;
  currentFilter: FilterType;
  dateRange?: {
    startDate: string | null;
    endDate: string | null;
  };
  lastModified: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY = 'chronicle-user-preferences';

  viewMode = signal<ViewMode>('grid');
  sortOrder = signal<SortOrder>('desc');
  currentFilter = signal<FilterType>('all');
  dateRange = signal<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });

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
      this.currentFilter.set(preferences.currentFilter || 'all');

      if (preferences.dateRange) {
        const startDate = preferences.dateRange.startDate ? new Date(preferences.dateRange.startDate) : null;
        const endDate = preferences.dateRange.endDate ? new Date(preferences.dateRange.endDate) : null;
        this.dateRange.set({ startDate, endDate });
      }
    } catch (error) {
      console.error('Error loading user preferences from localStorage:', error);
    }
  }

  private savePreferences(): void {
    try {
      const currentDateRange = this.dateRange();
      const preferences: UserPreferences = {
        viewMode: this.viewMode(),
        sortOrder: this.sortOrder(),
        currentFilter: this.currentFilter(),
        dateRange: {
          startDate: currentDateRange.startDate ? currentDateRange.startDate.toISOString() : null,
          endDate: currentDateRange.endDate ? currentDateRange.endDate.toISOString() : null
        },
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

  setFilter(filter: FilterType): void {
    this.currentFilter.set(filter);
    this.savePreferences();
  }

  setDateRange(startDate: Date | null, endDate: Date | null): void {
    this.dateRange.set({ startDate, endDate });
    this.savePreferences();
  }

  getPreferences(): UserPreferences {
    const currentDateRange = this.dateRange();
    return {
      viewMode: this.viewMode(),
      sortOrder: this.sortOrder(),
      currentFilter: this.currentFilter(),
      dateRange: {
        startDate: currentDateRange.startDate ? currentDateRange.startDate.toISOString() : null,
        endDate: currentDateRange.endDate ? currentDateRange.endDate.toISOString() : null
      },
      lastModified: Date.now()
    };
  }

  resetPreferences(): void {
    this.viewMode.set('grid');
    this.sortOrder.set('desc');
    this.currentFilter.set('all');
    this.dateRange.set({ startDate: null, endDate: null });
    this.savePreferences();
  }

  clearPreferences(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.viewMode.set('grid');
      this.sortOrder.set('desc');
      this.currentFilter.set('all');
      this.dateRange.set({ startDate: null, endDate: null });
    } catch (error) {
      console.error('Error clearing user preferences:', error);
    }
  }
}
