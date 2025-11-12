import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { NewsArticle } from '../models/news-article.interface';

interface RSSParseResult {
  articles: NewsArticle[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RssParserService {
  constructor(private http: HttpClient) {}

  fetchAndParseRSS(feedUrl: string, sourceName: string): Observable<RSSParseResult> {
    // Use a CORS proxy for RSS feeds
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;

    return this.http.get(proxyUrl, { responseType: 'text' }).pipe(
      map(xmlText => {
        try {
          const articles = this.parseRSSFeed(xmlText, sourceName);
          return { articles };
        } catch (error: any) {
          console.error(`Error parsing RSS feed from ${sourceName}:`, error);
          return { articles: [], error: `Failed to parse RSS feed: ${error.message}` };
        }
      }),
      catchError(error => {
        console.error(`Error fetching RSS feed from ${sourceName}:`, error);
        return of({ articles: [], error: `Failed to fetch RSS feed: ${error.message}` });
      })
    );
  }

  private parseInMainThread(xmlText: string, sourceName: string): RSSParseResult {
    try {
      const articles = this.parseRSSFeed(xmlText, sourceName);
      return { articles };
    } catch (error: any) {
      console.error(`Error parsing RSS feed from ${sourceName}:`, error);
      return { articles: [], error: `Failed to parse RSS feed: ${error.message}` };
    }
  }

  private parseRSSFeed(xmlText: string, sourceName: string): NewsArticle[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML format');
    }

    // Try RSS 2.0 format first
    let items = xmlDoc.querySelectorAll('rss > channel > item');

    // If no items found, try Atom format
    if (items.length === 0) {
      items = xmlDoc.querySelectorAll('feed > entry');
      if (items.length > 0) {
        return this.parseAtomFeed(items, sourceName);
      }
    }

    // Parse RSS 2.0
    const articles: NewsArticle[] = [];
    items.forEach((item, index) => {
      try {
        const title = this.getTextContent(item, 'title');
        const description = this.getTextContent(item, 'description') ||
                          this.getNamespacedTextContent(item, 'content:encoded') ||
                          this.getTextContent(item, 'summary');
        const link = this.getTextContent(item, 'link');
        const pubDateStr = this.getTextContent(item, 'pubDate') ||
                          this.getNamespacedTextContent(item, 'dc:date');
        const imageUrl = this.extractImageUrl(item);

        if (title && link) {
          const article: NewsArticle = {
            id: `${sourceName}-${Date.now()}-${index}`,
            title: this.cleanText(title),
            description: this.cleanText(description) || '',
            url: link,
            sourceName: sourceName,
            publishedAt: pubDateStr ? new Date(pubDateStr) : new Date(),
            imageUrl: imageUrl || '',
            isRead: false,
            isBookmarked: false,
            isReadLater: false,
            isSkipped: false,
            category: 'News'
          };
          articles.push(article);
        }
      } catch (error) {
        console.warn('Error parsing RSS item:', error);
      }
    });

    return articles;
  }

  private parseAtomFeed(entries: NodeListOf<Element>, sourceName: string): NewsArticle[] {
    const articles: NewsArticle[] = [];

    entries.forEach((entry, index) => {
      try {
        const title = this.getTextContent(entry, 'title');
        const summary = this.getTextContent(entry, 'summary') ||
                       this.getTextContent(entry, 'content');
        const linkElement = entry.querySelector('link[rel="alternate"]') ||
                          entry.querySelector('link');
        const link = linkElement?.getAttribute('href') || '';
        const publishedStr = this.getTextContent(entry, 'published') ||
                           this.getTextContent(entry, 'updated');
        const imageUrl = this.extractAtomImageUrl(entry);

        if (title && link) {
          const article: NewsArticle = {
            id: `${sourceName}-${Date.now()}-${index}`,
            title: this.cleanText(title),
            description: this.cleanText(summary) || '',
            url: link,
            sourceName: sourceName,
            publishedAt: publishedStr ? new Date(publishedStr) : new Date(),
            imageUrl: imageUrl || '',
            isRead: false,
            isBookmarked: false,
            isReadLater: false,
            isSkipped: false,
            category: 'News'
          };
          articles.push(article);
        }
      } catch (error) {
        console.warn('Error parsing Atom entry:', error);
      }
    });

    return articles;
  }

  private getTextContent(parent: Element, tagName: string): string {
    const element = parent.querySelector(tagName);
    return element?.textContent?.trim() || '';
  }

  private getNamespacedTextContent(parent: Element, tagName: string): string {
    // Handle namespaced tags like content:encoded, dc:date
    const [namespace, localName] = tagName.split(':');

    // Try multiple approaches to find namespaced elements

    // Approach 1: Direct getElementsByTagName (works with namespaces)
    const elements = parent.getElementsByTagName(tagName);
    if (elements.length > 0) {
      return elements[0].textContent?.trim() || '';
    }

    // Approach 2: Try getElementsByTagNameNS if namespace is known
    const namespaceURIs: { [key: string]: string } = {
      'content': 'http://purl.org/rss/1.0/modules/content/',
      'dc': 'http://purl.org/dc/elements/1.1/',
      'media': 'http://search.yahoo.com/mrss/'
    };

    if (namespace && localName && namespaceURIs[namespace]) {
      const nsElements = parent.getElementsByTagNameNS(namespaceURIs[namespace], localName);
      if (nsElements.length > 0) {
        return nsElements[0].textContent?.trim() || '';
      }
    }

    // Approach 3: Try escaped selector with backslash
    try {
      const escapedSelector = `${namespace}\\:${localName}`;
      const element = parent.querySelector(escapedSelector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    } catch {
      // Ignore selector errors
    }

    return '';
  }

  private cleanText(text: string): string {
    // Remove HTML tags
    const withoutTags = text.replace(/<[^>]*>/g, '');
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = withoutTags;
    return textarea.value.trim();
  }

  private extractImageUrl(item: Element): string {
    // Try media:content using getElementsByTagName
    let mediaContent = item.getElementsByTagName('media:content')[0];
    if (!mediaContent) {
      // Try with namespace
      mediaContent = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
    }
    if (mediaContent) {
      const url = mediaContent.getAttribute('url');
      if (url) return url;
    }

    // Try media:thumbnail
    let mediaThumbnail = item.getElementsByTagName('media:thumbnail')[0];
    if (!mediaThumbnail) {
      mediaThumbnail = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail')[0];
    }
    if (mediaThumbnail) {
      const url = mediaThumbnail.getAttribute('url');
      if (url) return url;
    }

    // Try enclosure
    const enclosure = item.querySelector('enclosure[type^="image"]');
    if (enclosure) {
      const url = enclosure.getAttribute('url');
      if (url) return url;
    }

    // Try to find image in description/content
    const description = this.getTextContent(item, 'description') ||
                       this.getNamespacedTextContent(item, 'content:encoded');
    if (description) {
      const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
      }
    }

    return '';
  }

  private extractAtomImageUrl(entry: Element): string {
    // Try link with type="image/*"
    const imageLink = entry.querySelector('link[type^="image"]');
    if (imageLink) {
      const url = imageLink.getAttribute('href');
      if (url) return url;
    }

    // Try to find image in content
    const content = this.getTextContent(entry, 'content') ||
                   this.getTextContent(entry, 'summary');
    if (content) {
      const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
      }
    }

    return '';
  }
}
