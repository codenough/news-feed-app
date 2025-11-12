import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NewsCardComponent } from './components/news-card/news-card.component';
import { ThemeToggleComponent } from './components/theme-toggle.component';
import { NewsArticle } from './models/news-article.interface';

@Component({
  selector: 'app-root',
  imports: [CommonModule, NewsCardComponent, ThemeToggleComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Chronicle News Feed');
  protected viewMode = signal<'grid' | 'list'>('grid');

  protected sampleArticles: NewsArticle[] = [
    {
      id: '1',
      title: 'Breaking: New Climate Agreement Reached at Global Summit',
      description: 'World leaders have agreed to ambitious new targets for reducing carbon emissions, marking a historic moment in the fight against climate change.',
      imageUrl: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&h=600&fit=crop',
      sourceName: 'Global News Network',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      url: 'https://example.com/article1',
      isRead: false,
      isBookmarked: false,
      isReadLater: false,
      isSkipped: false
    },
    {
      id: '2',
      title: 'Tech Giant Announces Revolutionary AI Breakthrough',
      description: 'The company\'s latest artificial intelligence system demonstrates unprecedented capabilities in natural language understanding and generation.',
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop',
      sourceName: 'Tech Today',
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      url: 'https://example.com/article2',
      isRead: true,
      isBookmarked: true,
      isReadLater: false,
      isSkipped: false
    },
    {
      id: '3',
      title: 'Local Community Rallies to Support New Education Initiative',
      description: 'Residents come together to fund programs aimed at improving educational opportunities for underserved students in the district.',
      imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop',
      sourceName: 'Community Voice',
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      url: 'https://example.com/article3',
      isRead: false,
      isBookmarked: false,
      isReadLater: true,
      isSkipped: false
    },
    {
      id: '4',
      title: 'Stock Markets Show Strong Recovery After Turbulent Week',
      description: 'Major indices close higher as investors regain confidence following positive economic indicators and corporate earnings reports.',
      imageUrl: '',
      sourceName: 'Financial Times',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      url: 'https://example.com/article4',
      isRead: true,
      isBookmarked: false,
      isReadLater: false,
      isSkipped: false
    }
  ];

  protected onCardClick(article: NewsArticle): void {
    console.log('Card clicked:', article.title);
    window.open(article.url, '_blank');
    article.isRead = true;
  }

  protected onBookmarkToggle(article: NewsArticle): void {
    article.isBookmarked = !article.isBookmarked;
    console.log('Bookmark toggled:', article.title, article.isBookmarked);
  }

  protected onReadLaterToggle(article: NewsArticle): void {
    article.isReadLater = !article.isReadLater;
    console.log('Read later toggled:', article.title, article.isReadLater);
  }

  protected onMenuClick(article: NewsArticle): void {
    console.log('Menu clicked for:', article.title);
  }

  protected toggleViewMode(): void {
    this.viewMode.update(mode => mode === 'grid' ? 'list' : 'grid');
  }
}
