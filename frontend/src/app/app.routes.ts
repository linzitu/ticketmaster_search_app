// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { SearchPageComponent } from './pages/search-page.component';
import { FavoritesPageComponent } from './pages/favorites-page.component';
import { EventDetailPageComponent } from './pages/event-detail-page.component';

export const appRoutes: Routes = [
  // 默认进入时显示 search 页面
  { path: '', redirectTo: 'search', pathMatch: 'full' },

  // 搜索页
  { path: 'search', component: SearchPageComponent },

  // 收藏页
  { path: 'favorites', component: FavoritesPageComponent },

  // 详情页
  { path: 'details/:id', component: EventDetailPageComponent },

  // 兜底：任何未知路径都回到 search
  { path: '**', redirectTo: 'search' }
];
