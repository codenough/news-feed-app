import { Injectable, signal } from '@angular/core';

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastUpdated: Date;
}

interface StoredSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root'
})
export class SourceManagementService {
  private readonly STORAGE_KEY = 'chronicle-news-sources';
  
  sources = signal<NewsSource[]>([]);

  constructor() {
    this.loadSources();
  }

  private loadSources(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed: StoredSource[] = JSON.parse(stored);
        const sources = parsed.map(s => ({
          ...s,
          lastUpdated: new Date(s.lastUpdated)
        }));
        this.sources.set(sources);
      } else {
        this.initializeDefaultSources();
      }
    } catch (error) {
      console.error('Error loading sources:', error);
      this.initializeDefaultSources();
    }
  }

  private initializeDefaultSources(): void {
    const defaultSources: NewsSource[] = [
      {
        id: '1',
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        enabled: true,
        lastUpdated: new Date()
      },
      {
        id: '2',
        name: 'The Verge',
        url: 'https://www.theverge.com/rss/index.xml',
        enabled: true,
        lastUpdated: new Date()
      },
      {
        id: '3',
        name: 'Hacker News',
        url: 'https://news.ycombinator.com/rss',
        enabled: true,
        lastUpdated: new Date()
      }
    ];
    this.sources.set(defaultSources);
    this.saveSources();
  }

  private saveSources(): void {
    try {
      const toStore: StoredSource[] = this.sources().map(s => ({
        ...s,
        lastUpdated: s.lastUpdated.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Error saving sources:', error);
    }
  }

  addSource(name: string, url: string, enabled: boolean = true): NewsSource {
    const newSource: NewsSource = {
      id: Date.now().toString(),
      name,
      url,
      enabled,
      lastUpdated: new Date()
    };
    
    this.sources.set([...this.sources(), newSource]);
    this.saveSources();
    return newSource;
  }

  updateSource(id: string, name: string, url: string, enabled: boolean): boolean {
    const currentSources = this.sources();
    const index = currentSources.findIndex(s => s.id === id);
    
    if (index === -1) return false;
    
    const updatedSources = [...currentSources];
    updatedSources[index] = {
      ...updatedSources[index],
      name,
      url,
      enabled,
      lastUpdated: new Date()
    };
    
    this.sources.set(updatedSources);
    this.saveSources();
    return true;
  }

  toggleSource(id: string): boolean {
    const currentSources = this.sources();
    const index = currentSources.findIndex(s => s.id === id);
    
    if (index === -1) return false;
    
    const updatedSources = [...currentSources];
    updatedSources[index] = {
      ...updatedSources[index],
      enabled: !updatedSources[index].enabled,
      lastUpdated: new Date()
    };
    
    this.sources.set(updatedSources);
    this.saveSources();
    return true;
  }

  deleteSource(id: string): boolean {
    const currentSources = this.sources();
    const filtered = currentSources.filter(s => s.id !== id);
    
    if (filtered.length === currentSources.length) return false;
    
    this.sources.set(filtered);
    this.saveSources();
    return true;
  }

  getEnabledSources(): NewsSource[] {
    return this.sources().filter(s => s.enabled);
  }

  getSourceById(id: string): NewsSource | undefined {
    return this.sources().find(s => s.id === id);
  }
}
