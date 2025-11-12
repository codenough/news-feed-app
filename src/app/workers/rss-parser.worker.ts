// RSS Parser Web Worker
interface RSSParseMessage {
  type: 'parse';
  xmlText: string;
  sourceName: string;
}

interface RSSParseResult {
  type: 'success' | 'error';
  articles?: any[];
  error?: string;
}

self.onmessage = (event: MessageEvent<RSSParseMessage>) => {
  const { type, xmlText, sourceName } = event.data;

  if (type === 'parse') {
    try {
      const articles = parseRSSFeed(xmlText, sourceName);
      const result: RSSParseResult = {
        type: 'success',
        articles
      };
      self.postMessage(result);
    } catch (error: any) {
      const result: RSSParseResult = {
        type: 'error',
        error: error.message || 'Failed to parse RSS feed'
      };
      self.postMessage(result);
    }
  }
};

function parseRSSFeed(xmlText: string, sourceName: string): any[] {
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
      return parseAtomFeed(items, sourceName);
    }
  }

  // Parse RSS 2.0
  const articles: any[] = [];
  items.forEach((item, index) => {
    try {
      const title = getTextContent(item, 'title');
      const description = getTextContent(item, 'description') ||
        getNamespacedTextContent(item, 'content:encoded') ||
        getTextContent(item, 'summary');
      const link = getTextContent(item, 'link');
      const pubDateStr = getTextContent(item, 'pubDate') ||
        getNamespacedTextContent(item, 'dc:date');
      const imageUrl = extractImageUrl(item);

      if (title && link) {
        const article = {
          id: `${sourceName}-${Date.now()}-${index}`,
          title: cleanText(title),
          description: cleanText(description) || '',
          url: link,
          sourceName: sourceName,
          publishedAt: pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString(),
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

function parseAtomFeed(entries: NodeListOf<Element>, sourceName: string): any[] {
  const articles: any[] = [];

  entries.forEach((entry, index) => {
    try {
      const title = getTextContent(entry, 'title');
      const summary = getTextContent(entry, 'summary') ||
        getTextContent(entry, 'content');
      const linkElement = entry.querySelector('link[rel="alternate"]') ||
        entry.querySelector('link');
      const link = linkElement?.getAttribute('href') || '';
      const publishedStr = getTextContent(entry, 'published') ||
        getTextContent(entry, 'updated');
      const imageUrl = extractAtomImageUrl(entry);

      if (title && link) {
        const article = {
          id: `${sourceName}-${Date.now()}-${index}`,
          title: cleanText(title),
          description: cleanText(summary) || '',
          url: link,
          sourceName: sourceName,
          publishedAt: publishedStr ? new Date(publishedStr).toISOString() : new Date().toISOString(),
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

function getTextContent(parent: Element, tagName: string): string {
  const element = parent.querySelector(tagName);
  return element?.textContent?.trim() || '';
}

function getNamespacedTextContent(parent: Element, tagName: string): string {
  const [namespace, localName] = tagName.split(':');

  // Try getElementsByTagName (works with namespaces)
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length > 0) {
    return elements[0].textContent?.trim() || '';
  }

  // Try getElementsByTagNameNS if namespace is known
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

  return '';
}

function cleanText(text: string): string {
  // Remove HTML tags
  const withoutTags = text.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = withoutTags;
  return textarea.value.trim();
}

function extractImageUrl(item: Element): string {
  // Try media:content
  let mediaContent = item.getElementsByTagName('media:content')[0];
  if (!mediaContent) {
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
  const description = getTextContent(item, 'description') ||
    getNamespacedTextContent(item, 'content:encoded');
  if (description) {
    const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  return '';
}

function extractAtomImageUrl(entry: Element): string {
  // Try link with type="image/*"
  const imageLink = entry.querySelector('link[type^="image"]');
  if (imageLink) {
    const url = imageLink.getAttribute('href');
    if (url) return url;
  }

  // Try to find image in content
  const content = getTextContent(entry, 'content') ||
    getTextContent(entry, 'summary');
  if (content) {
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  return '';
}

export { };
