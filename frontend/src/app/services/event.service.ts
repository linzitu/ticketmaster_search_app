// src/app/services/event.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventItem } from '../models/event';

export interface SearchParams {
  keywords: string;
  category: string;              // 前端表单里选的类别：all / music / sports...
  location: string;
  distance: number;
  autoDetectLocation: boolean;
  
  // 自动定位时传经纬度（可选）
  lat?: number | null;
  lon?: number | null;
}

export interface EventDetail {
  id: string;
  name: string;
  date: string;
  time: string;
  artistTeam: string;
  venue: string;           // 场馆名称
  genres: string;
  category: string;
  ticketStatus: string;
  buyTicketUrl: string;
  seatmapUrl: string;
  shareUrl: string;
  imageUrl?: string;

  // ✅ 新增：Venue 相关字段（可选）
  venueParking?: string;
  venueGeneralRule?: string;
  venueChildRule?: string;
}

// ✅ Spotify Artist 的结构
export interface SpotifyArtist {
  id: string;
  name: string;
  followers: number;
  popularity: number | null;
  genres: string[];
  imageUrl: string;
  spotifyUrl: string;
}

// ✅ Spotify Album 的结构
export interface SpotifyAlbum {
  id: string;
  name: string;
  releaseDate: string;
  totalTracks: number;
  imageUrl: string;
  spotifyUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class EventService {
  // 所有后端接口都挂在 /api 下面
  private baseUrl = '/api';

  // 缓存上一次搜索条件和结果
  private lastSearchParams: SearchParams | null = null;
  private lastSearchResults: EventItem[] | null = null;

  // Ticketmaster segmentId 映射（全部小写方便匹配）
  private readonly segmentMap: Record<string, string> = {
    music: 'KZFzniwnSyZfZ7v7nJ',
    sports: 'KZFzniwnSyZfZ7v7nE',
    'arts & theatre': 'KZFzniwnSyZfZ7v7na',
    film: 'KZFzniwnSyZfZ7v7nn',
    miscellaneous: 'KZFzniwnSyZfZ7v7n1',
  };

  constructor(private http: HttpClient) {}

  // 把前端 SearchParams 转成后端 /api/events 的 query 参数
  private buildParams(params: SearchParams): HttpParams {
    const obj: any = {};

    // 关键词
    if (params.keywords && params.keywords.trim().length > 0) {
      obj['keyword'] = params.keywords.trim();
    }

    // 类别 -> segmentId（all 就不传）
    const catKey = params.category?.trim().toLowerCase();
    if (catKey && catKey !== 'all') {
      const seg = this.segmentMap[catKey];
      if (seg) {
        obj['segmentId'] = seg;
      }
    }

    // 距离 + 单位
    if (params.distance) {
      obj['radius'] = String(params.distance);
    } else {
      obj['radius'] = '10';
    }
    obj['unit'] = 'miles';

    // 地理位置：优先用自动定位的 lat/lon，其次用城市名
    if (params.autoDetectLocation && params.lat != null && params.lon != null) {
      obj['lat'] = String(params.lat);
      obj['lon'] = String(params.lon);
    } else if (params.location && params.location.trim().length > 0) {
      obj['city'] = params.location.trim();
    }

    return new HttpParams({ fromObject: obj });
  }

  // ✅ 搜索：请求 /api/events
  searchEvents(params: SearchParams): Observable<EventItem[]> {
    const httpParams = this.buildParams(params);
    return this.http.get<EventItem[]>(`${this.baseUrl}/events`, {
      params: httpParams,
    });
  }

  // （如果还需要 getEventById 走 /api/events/:id，可以这样写）
  getEventById(id: string): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.baseUrl}/events/${id}`);
  }

  // 保存搜索缓存（给你从详情 / favorites 返回时恢复用）
  saveLastSearch(params: SearchParams, results: EventItem[]): void {
    this.lastSearchParams = { ...params };
    this.lastSearchResults = [...results];
  }

  // 取搜索缓存
  getLastSearch():
    | { params: SearchParams; results: EventItem[] }
    | null {
    if (!this.lastSearchParams || !this.lastSearchResults) {
      return null;
    }
    return {
      params: { ...this.lastSearchParams },
      results: [...this.lastSearchResults],
    };
  }

  // 清空缓存（目前没用到，备用）
  clearLastSearch(): void {
    this.lastSearchParams = null;
    this.lastSearchResults = null;
  }

  // ✅ 详情：请求 /api/event/:id（单数）
  // 这里后端返回的是 Ticketmaster 原始 detail 对象，
  // 前端在 EventDetailPageComponent 里自己做 map，所以直接用 any 即可
  getEventDetails(id: string): Observable<any> {
    const url = `${this.baseUrl}/event/${id}`;
    return this.http.get<any>(url);
  }

  /**
   * 调用后端 /api/spotify/search-artist
   * 用名字在 Spotify 搜索最匹配的 Artist
   */
  searchSpotifyArtist(name: string): Observable<SpotifyArtist | null> {
    const params = new HttpParams().set('q', name);

    return this.http.get<SpotifyArtist | null>(
      `${this.baseUrl}/spotify/search-artist`,
      { params }
    );
  }

  /**
   * 调用后端 /api/spotify/artist-albums/:id
   * 根据 artist id 获取专辑列表
   */
  getSpotifyArtistAlbums(artistId: string): Observable<SpotifyAlbum[]> {
    return this.http.get<SpotifyAlbum[]>(
      `${this.baseUrl}/spotify/artist-albums/${encodeURIComponent(artistId)}`
    );
  }
}
