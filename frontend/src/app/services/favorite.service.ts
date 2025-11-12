// src/app/services/favorite.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EventItem } from '../models/event';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private favorites: EventItem[] = [];
  private apiUrl = '/api/favorites';

  constructor(private http: HttpClient) {
    // 1) 应用启动时，从后端/MongoDB 同步一次最新收藏
    this.fetchFavoritesFromServer().subscribe({
      next: () => {},
      error: (err) => console.error('Failed to sync favorites from server:', err),
    });

    // 2) 兼容：如果你想保留 localStorage，当后端没数据时也能恢复
    const saved = localStorage.getItem('favorites');
    if (!this.favorites.length && saved) {
      try {
        this.favorites = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse favorites from localStorage', e);
      }
    }
  }

  /** 内部工具：把当前 favorites 写回 localStorage（兼容原逻辑） */
  private saveToLocalStorage() {
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  }

  /** 从后端/MongoDB 拉取最新收藏，填充 this.favorites 并保存到 localStorage */
  fetchFavoritesFromServer(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(this.apiUrl).pipe(
      tap((list) => {
        this.favorites = list || [];
        this.saveToLocalStorage();
      })
    );
  }

  /** 返回当前内存里的收藏（同步） */
  getFavorites(): EventItem[] {
    return this.favorites;
  }

  /** 添加收藏：更新内存 + localStorage + 后端 MongoDB */
  addFavorite(event: EventItem) {
    if (this.isFavorite(event.id)) {
      return;
    }

    this.favorites.push(event);
    this.saveToLocalStorage();

    // 发到后端，真正存进 MongoDB
    this.http.post(this.apiUrl, event).subscribe({
      error: (err) => console.error('Failed to POST favorite:', err),
    });
  }

  /** 删除收藏：更新内存 + localStorage + 后端 MongoDB */
  removeFavorite(eventId: string) {
    this.favorites = this.favorites.filter((e) => e.id !== eventId);
    this.saveToLocalStorage();

    this.http.delete(`${this.apiUrl}/${eventId}`).subscribe({
      error: (err) => console.error('Failed to DELETE favorite:', err),
    });
  }

  /** 切换状态：保持你原来的调用方式不变 */
  toggleFavorite(event: EventItem) {
    if (this.isFavorite(event.id)) {
      this.removeFavorite(event.id);
    } else {
      this.addFavorite(event);
    }
  }

  /** 判断是否已收藏：供 Search 页 / Favorites 页模板使用 */
  isFavorite(eventId: string): boolean {
    return this.favorites.some((e) => e.id === eventId);
  }
}
