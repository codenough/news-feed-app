export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  sourceName: string;
  publishedAt: Date;
  url: string;
  isRead: boolean;
  isBookmarked: boolean;
  isReadLater: boolean;
  isSkipped: boolean;
  isExternal?: boolean;
  category?: string;
  author?: string;
}
