// src/app/pages/favorites-page/favorites-page.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { EventItem } from '../models/event';
import { FavoriteService } from '../services/favorite.service';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favorites-page.component.html',
  styleUrls: ['./favorites-page.component.css'],
})
export class FavoritesPageComponent implements OnInit {
  favorites: EventItem[] = [];
  noFavorites = false;
  isLoading = false;

  constructor(
    private favoriteService: FavoriteService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  /** 从后端/MongoDB 加载收藏列表 */
  loadFavorites(): void {
    this.isLoading = true;
    this.favoriteService.fetchFavoritesFromServer().subscribe({
      next: (list) => {
        this.favorites = list || [];
        this.noFavorites = this.favorites.length === 0;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load favorites', err);
        this.favorites = [];
        this.noFavorites = true;
        this.isLoading = false;
      },
    });
  }

  /** 跳转到详情页，路径按你实际 route 改，比如 ['/event', id] */
  goToDetail(id: string): void {
    this.router.navigate(['/details', id]);
  }

  /** 点击爱心：Favorites 页里是取消收藏 */
  toggleFavorite(ev: EventItem, event: MouseEvent): void {
    event.stopPropagation(); // 防止触发卡片点击跳详情

    if (this.favoriteService.isFavorite(ev.id)) {
      // 先调用 service 删除（内存 + MongoDB）
      this.favoriteService.removeFavorite(ev.id);

      // 然后更新本页列表
      this.favorites = this.favorites.filter((e) => e.id !== ev.id);
      this.noFavorites = this.favorites.length === 0;

      this.toastService.show({
        type: 'info', // ✅ 改成 info，这样右侧才能显示 Undo 按钮
        message: `${ev.name} removed from favorites!`,
        actionText: 'Undo', // ✅ 加上 Undo
        onAction: () => { // ✅ 点击 Undo 时执行的回调
          this.favoriteService.addFavorite(ev);
          this.toastService.show({
            type: 'success',
            message: `${ev.name} added back to favorites!`
          });
        }
      });      
    } else {
      // 这种情况通常不会在 favorites 页出现，但为了配合 undo 逻辑可以保留
      this.favoriteService.addFavorite(ev);
      this.favorites.push(ev);
      
      const index = this.favorites.findIndex((e) => e.id === ev.id);
      if (index !== -1) this.favorites.splice(index, 1);
      this.favoriteService.removeFavorite(ev.id);
      this.noFavorites = this.favorites.length === 0;
      this.toastService.show({
        type: 'info',                             // 原来是 success，改成 info
        message: `${ev.name} removed from favorites!`,
        actionText: 'Undo',
        onAction: () => {
          this.favoriteService.addFavorite(ev);
          this.toastService.show({ type: 'success', message: `${ev.name} added back to favorites!` });
        }
      });     
    }
  }

  // 模板用来控制爱心样式
  isFavorite(ev: EventItem): boolean {
    return this.favoriteService.isFavorite(ev.id);
  }
}
