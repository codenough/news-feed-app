export interface ExternalArticle {
  id: string;
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  sourceName?: string;
  addedAt: Date;
  isExternal: true;
}

export interface ArticleMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  sourceName?: string;
  url: string;
}
