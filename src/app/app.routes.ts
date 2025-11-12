import { Routes } from '@angular/router';
import { FeedComponent } from './pages/feed/feed.component';
import { ReadLaterComponent } from './pages/read-later/read-later.component';

export const routes: Routes = [
  {
    path: '',
    component: FeedComponent
  },
  {
    path: 'read-later',
    component: ReadLaterComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
