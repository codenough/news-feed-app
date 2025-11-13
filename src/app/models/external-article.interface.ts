export interface ExternalArticle {
  id: string;
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  sourceName?: string;
  addedAt: Date;
  isExternal: true;
  isRead?: boolean;
  isBookmarked?: boolean;
}

export interface ArticleMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  sourceName?: string;
  url: string;
}
