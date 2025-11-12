import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { ArticleMetadata } from '../models/external-article.interface';

@Injectable({
  providedIn: 'root'
})
export class MetadataExtractionService {
  private http = inject(HttpClient);

  fetchMetadata(url: string): Observable<ArticleMetadata> {
    // Since we can't directly scrape external URLs due to CORS,
    // we'll use a mock implementation that extracts basic info from the URL
    // In a real app, this would call a backend API that does the scraping
    return this.extractBasicMetadata(url);
  }

  private extractBasicMetadata(url: string): Observable<ArticleMetadata> {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);

      // Extract potential title from URL path
      const lastSegment = pathSegments[pathSegments.length - 1] || '';
      const titleFromUrl = lastSegment
        .replace(/\.(html|htm|php|aspx)$/, '')
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const metadata: ArticleMetadata = {
        url,
        title: titleFromUrl || 'External Article',
        description: `Article from ${hostname}`,
        sourceName: this.getSourceNameFromHostname(hostname),
        imageUrl: undefined
      };

      return of(metadata);
    } catch (error) {
      return of({
        url,
        title: 'External Article',
        description: 'Article from external source',
        sourceName: 'External Source',
        imageUrl: undefined
      });
    }
  }

  private getSourceNameFromHostname(hostname: string): string {
    // Map common news sites to their proper names
    const sourceMap: Record<string, string> = {
      'nytimes.com': 'The New York Times',
      'washingtonpost.com': 'The Washington Post',
      'theguardian.com': 'The Guardian',
      'bbc.com': 'BBC News',
      'bbc.co.uk': 'BBC News',
      'cnn.com': 'CNN',
      'reuters.com': 'Reuters',
      'apnews.com': 'Associated Press',
      'bloomberg.com': 'Bloomberg',
      'wsj.com': 'The Wall Street Journal',
      'forbes.com': 'Forbes',
      'techcrunch.com': 'TechCrunch',
      'theverge.com': 'The Verge',
      'arstechnica.com': 'Ars Technica',
      'wired.com': 'Wired'
    };

    return sourceMap[hostname] || hostname
      .split('.')
      .slice(0, -1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
