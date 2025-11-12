import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// 导入三个页面组件
import { SearchPageComponent } from './search-page.component';
import { FavoritesPageComponent } from './favorites-page.component';
import { EventDetailPageComponent } from './event-detail-page.component';

@NgModule({
  declarations: [
    SearchPageComponent,
    FavoritesPageComponent,
    EventDetailPageComponent,
  ],
  imports: [
    CommonModule,  // ✅ 启用 *ngIf / *ngFor 等常用指令
    RouterModule,  // ✅ 让页面能用 <router-outlet> / 路由导航
  ],
  exports: [
    SearchPageComponent,
    FavoritesPageComponent,
    EventDetailPageComponent,
  ],
})
export class PagesModule {}
