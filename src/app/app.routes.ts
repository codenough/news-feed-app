import { Routes } from '@angular/router';
import { FeedComponent } from './pages/feed/feed.component';
import { ReadLaterComponent } from './pages/read-later/read-later.component';
import { AdminComponent } from './pages/admin/admin.component';

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
    path: 'admin',
    component: AdminComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
