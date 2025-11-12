# NewsCard Component

A fully-featured, responsive news article card component built for the Chronicle news feed application.

## Features

- **Dual View Modes**: Supports both grid and list layouts
- **Visual Read/Unread States**: Clear opacity-based distinction
- **Interactive Actions**: Bookmark, Read Later, and More menu options
- **Responsive Design**: Mobile-optimized with breakpoints
- **Typography**: Merriweather for headlines, Lato for body text
- **Color System**: Uses semantic CSS variables for theming
- **Accessibility**: ARIA labels, keyboard navigation, focus states
- **Hover Effects**: Smooth elevation and border color transitions
- **Image Handling**: Lazy loading with graceful fallback for missing images

## Usage

### Basic Implementation

```typescript
import { NewsCardComponent } from './components/news-card/news-card.component';
import { NewsArticle } from './models/news-article.interface';

@Component({
  // ...
  imports: [NewsCardComponent]
})
export class YourComponent {
  article: NewsArticle = {
    id: '1',
    title: 'Article Title',
    description: 'Article description...',
    imageUrl: 'https://example.com/image.jpg',
    sourceName: 'News Source',
    publishedAt: new Date(),
    url: 'https://example.com/article',
    isRead: false,
    isBookmarked: false,
    isReadLater: false,
    isSkipped: false
  };

  onCardClick(article: NewsArticle) {
    window.open(article.url, '_blank');
  }

  onBookmark(article: NewsArticle) {
    article.isBookmarked = !article.isBookmarked;
  }

  onReadLater(article: NewsArticle) {
    article.isReadLater = !article.isReadLater;
  }

  onMenu(article: NewsArticle) {
    // Show contextual menu
  }
}
```

### Template

```html
<app-news-card
  [article]="article"
  [viewMode]="'grid'"
  (cardClick)="onCardClick($event)"
  (bookmarkToggle)="onBookmark($event)"
  (readLaterToggle)="onReadLater($event)"
  (menuClick)="onMenu($event)"
/>
```

## API

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `article` | `NewsArticle` | Yes | - | The article data to display |
| `viewMode` | `'grid' \| 'list'` | No | `'grid'` | Display mode for the card |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `cardClick` | `EventEmitter<NewsArticle>` | Emitted when card body is clicked |
| `bookmarkToggle` | `EventEmitter<NewsArticle>` | Emitted when bookmark icon is clicked |
| `readLaterToggle` | `EventEmitter<NewsArticle>` | Emitted when read later icon is clicked |
| `menuClick` | `EventEmitter<NewsArticle>` | Emitted when menu icon is clicked |

## NewsArticle Interface

```typescript
interface NewsArticle {
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
  category?: string;
  author?: string;
}
```

## Styling

### Grid View
- Card width: Auto-fill with min 320px
- Image height: 200px
- Vertical layout

### List View
- Full width layout
- Horizontal layout with image on left
- Image size: 200x150px
- Actions displayed vertically on right

### Mobile Responsive
- List view reverts to vertical layout on mobile
- Reduced text sizes
- Adjusted spacing

## Color Variables Used

The component uses semantic color variables from the global theme:

- `--color-bg-card`: Card background
- `--color-border-default`: Default borders
- `--color-border-card-hover`: Hover state border
- `--color-text-primary`: Title text
- `--color-text-secondary`: Description text
- `--color-text-tertiary`: Metadata text
- `--color-text-read`: Read article styling
- `--color-icon-default`: Icon colors
- `--color-icon-active`: Active icon state
- `--color-brand-primary`: Hover effects
- `--color-state-unread-indicator`: Unread badge

## Accessibility

- Semantic HTML (`<article>` element)
- ARIA labels on all interactive buttons
- Keyboard navigation support
- Focus visible styles
- Image alt text support
- Screen reader friendly time formatting

## Time Formatting

The component includes intelligent relative time formatting:
- "Just now" for < 1 minute
- "Xm ago" for minutes
- "Xh ago" for hours
- "Xd ago" for days < 7
- Date format for older articles

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid support required
- CSS Custom Properties required
- Flexbox support required
