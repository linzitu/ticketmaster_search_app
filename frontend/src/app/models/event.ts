// src/app/models/event.ts

// 搜索结果列表 & Favorites 通用的事件结构
export interface EventItem {
  id: string;
  name: string;
  date: string;
  time: string;
  genre: string;     // 比如 Music / Sports ...
  category: string;  // 你后端 map 出来的 segment/category
  venue: string;
  city: string;

  // 前端用来标记是否已收藏（可选字段）
  isFavorite?: boolean;
  // 列表 / favorites 卡片用的主图
  imageUrl?: string;      
}
