import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EventService,
  EventDetail,
  SpotifyArtist,
  SpotifyAlbum,
} from '../services/event.service'; // 路径按实际改
import { NgIf, NgForOf } from '@angular/common';   // ✅ 新增：引入 NgIf / NgFor
import { FavoriteService } from '../services/favorite.service';
import { EventItem } from '../models/event';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-event-detail-page',
  standalone: true,   // ✅ 声明这是 standalone 组件
  imports: [NgIf, NgForOf],  // ✅ 这里先把 NgIf / NgFor 加进来，后面要循环专辑也能用
  templateUrl: './event-detail-page.component.html',
  styleUrls: ['./event-detail-page.component.css'],
})

export class EventDetailPageComponent implements OnInit {
  event: EventDetail | null = null;
  loading = true;
  errorMessage = '';
  // 当前 tab，默认 Info
  activeTab: 'info' | 'artist' | 'venue' = 'info';

  // Spotify Artist 状态
  artistLoading = false;
  artistLoaded = false;
  artistError: string | null = null;
  artistInfo: SpotifyArtist | null = null;
  artistAlbums: SpotifyAlbum[] = [];

  //venue
  // Venue tab 需要的字段
  venueAddressLine = '';
  googleMapsUrl: string | null = null;
  venueSeeEventsUrl: string | null = null;
  venueImageUrl: string | null = null;

  isMusicEvent: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private favoriteService: FavoriteService,
    private toastService: ToastService 
  ) {}

  ngOnInit(): void {
    console.log('Initial activeTab:', this.activeTab); // 应输出 'info'
    const id = this.route.snapshot.paramMap.get('id');
    console.log('detail route id =', id);
    if (!id) {
      this.errorMessage = 'Invalid event id';
      this.loading = false;
      return;
    }
    this.fetchEventDetails(id);
  }

  // 加载 Ticketmaster 事件详情（后端现在返回的是 TM 原始 event）
  fetchEventDetails(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    // 新的 event：回到 Info tab 并重置 Artist 状态
    this.activeTab = 'info';
    this.artistLoaded = false;
    this.artistInfo = null;
    this.artistAlbums = [];
    this.artistError = null;
    
    this.eventService.getEventDetails(id).subscribe({
      next: (data) => {
        console.log('detail raw data =', data);
        this.event = this.mapTmEventToDetail(data);
        this.isMusicEvent = this.event?.category?.toLowerCase() === 'music';

        this.setupVenueFromTmEvent(data);
        console.log('mapped event =', this.event);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load event details:', err);
        this.errorMessage = 'Failed to load event details';
        this.loading = false;
      },
    });
  }
  
  // 从 TM 原始 event 中提取场馆信息，给 Venue tab 用
  // 场馆信息（地址 + Google Maps + See Events + 图片）
  private setupVenueFromTmEvent(e: any): void {
    const v = e?._embedded?.venues?.[0];
    if (!v) {
      this.venueAddressLine = '';
      this.googleMapsUrl = null;
      this.venueSeeEventsUrl = null;
      this.venueImageUrl = null;
      return;
    }

    const line1 = v.address?.line1 || '';
    const city = v.city?.name || '';
    const state = v.state?.stateCode || v.state?.name || '';

    const parts = [line1, city, state].filter(Boolean);
    this.venueAddressLine = parts.join(', ');

    this.googleMapsUrl = this.venueAddressLine
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          this.venueAddressLine
        )}`
      : null;

    this.venueSeeEventsUrl = v.url || null;

    const images: any[] = v.images || [];
    this.venueImageUrl = images.length ? images[0].url : null;
  }
  
// 把 TM 的原始 event 映射成前端方便用的结构
private mapTmEventToDetail(e: any): EventDetail {
  const date = e?.dates?.start?.localDate || 'N/A';
  const time = e?.dates?.start?.localTime || '';
  
  // ✅ 主封面图（和 search 一样：取宽度最大的那张）
  const images: any[] = e?.images || [];
  const bestImage = images.reduce((best: any, img: any) => {
    if (!best) return img;
    if ((img?.width || 0) > (best?.width || 0)) return img;
    return best;
  }, null as any);
  const imageUrl: string = bestImage?.url || '';

  // 场馆原始对象
  const v = e?._embedded?.venues?.[0];

  // ✅ 只取名字作为 venue，用在 Info tab 和 Venue tab 标题
  const venueName: string = v?.name || 'N/A';

  const artists =
    (e?._embedded?.attractions || [])
      .map((a: any) => a.name)
      .filter(Boolean)
      .join(', ') || 'N/A';

  const cls = e?.classifications?.[0] || {};
  const genresParts: string[] = [];
  if (cls.segment?.name) genresParts.push(cls.segment.name);
  if (cls.genre?.name) genresParts.push(cls.genre.name);
  if (cls.subGenre?.name && cls.subGenre.name !== 'Undefined') {
    genresParts.push(cls.subGenre.name);
  }
  const genres = genresParts.join(', ') || 'N/A';

  const rawStatus: string = e?.dates?.status?.code || '';
  let ticketStatus = 'N/A';
  if (rawStatus) {
    switch (rawStatus.toLowerCase()) {
      case 'onsale':
        ticketStatus = 'On Sale';
        break;
      case 'offsale':
        ticketStatus = 'Off Sale';
        break;
      case 'canceled':
        ticketStatus = 'Canceled';
        break;
      case 'postponed':
        ticketStatus = 'Postponed';
        break;
      case 'rescheduled':
        ticketStatus = 'Rescheduled';
        break;
      default:
        ticketStatus = rawStatus;
    }
  }

  // 1. 首选 event.seatmap.staticUrl
  let seatmapUrl = e?.seatmap?.staticUrl || '';

  // 2. 没有的话，从场馆图片里找 seat / map / chart 关键字
  if (!seatmapUrl) {
    const venueImages = v?.images || [];
    const seatImg = venueImages.find((img: any) =>
      /seat|map|chart/i.test(img?.url || '')
    );
    seatmapUrl = seatImg?.url || '';
  }

  // ✅ 提取场馆规则相关字段，全部转成 string
  const venueParking: string = v?.parkingDetail || '';

  const venueGeneralRule: string =
    // 有些返回 generalInfo 是对象 { generalRule, childRule }
    (typeof v?.generalInfo === 'string'
      ? v.generalInfo
      : v?.generalInfo?.generalRule) ||
    v?.generalRule ||
    '';

  const venueChildRule: string =
    (typeof v?.generalInfo === 'string'
      ? ''
      : v?.generalInfo?.childRule) ||
    v?.childRule ||
    '';

  return {
    id: e?.id || '',
    name: e?.name || 'N/A',
    date,
    time,
    artistTeam: artists,
    venue: venueName,          
    genres,
    category: cls.segment?.name || 'N/A',
    ticketStatus,
    buyTicketUrl: e?.url || '',
    seatmapUrl,
    shareUrl: e?.url || '',
    imageUrl,
    // ✅ Venue tab 用
    venueParking,
    venueGeneralRule,
    venueChildRule,
  };
}


  // 返回按钮
  goBack(): void {
    this.router.navigate(['/search']);
  }

 // 详情页：点击收藏/取消收藏
 toggleFavoriteFromDetail(): void {
  if (!this.event) return;

  const alreadyFavorite = this.favoriteService.isFavorite(this.event.id);

  const item: EventItem = {
    id: this.event.id,
    name: this.event.name,
    date: this.event.date,
    time: this.event.time,
    genre: this.event.genres || '',
    category: '',
    venue: this.event.venue,
    city: '',
    imageUrl: this.event.imageUrl || ''
  };

  this.favoriteService.toggleFavorite(item);

  if (!alreadyFavorite) {
    this.toastService.show({
      type: 'success',
      message: `${this.event.name} added to favorites!`,
      subMessage: 'You can view it in the Favorites page.',
    });
  } else {
    this.toastService.show({
      type: 'info',
      message: `${this.event.name} removed from favorites!`,
      actionText: 'Undo',
      onAction: () => {
        
        this.favoriteService.addFavorite(item);
        this.toastService.show({
          type: 'success',
          message: `${this.event.name} added back to favorites!`,
        });
      },
    });
  }
}

  // 详情页：当前事件是否已收藏
  get isFavorite(): boolean {
    return this.event ? this.favoriteService.isFavorite(this.event.id) : false;
  }
  // Tab 切换：HTML 里用 (click)="setActiveTab('info')"
  setActiveTab(tab: 'info' | 'artist' | 'venue'): void {
    console.log('Switching to tab:', tab); // 应输出 'info'、'artist' 或 'venue'
    this.activeTab = tab;

    if (tab === 'artist' && !this.artistLoaded) {
      this.loadArtistData();
    }
  }

  // 调用后端 Spotify 接口
  private loadArtistData(): void {
    if (!this.event) {
      this.artistError = 'Event not loaded';
      this.artistLoaded = true;
      return;
    }

    const name =
      (this.event.artistTeam && this.event.artistTeam.trim()) ||
      (this.event.name && this.event.name.trim());

    if (!name) {
      this.artistError = 'Artist name unavailable';
      this.artistLoaded = true;
      return;
    }

    this.artistLoading = true;
    this.artistError = null;

    // 1) 先按名字搜索 artist
    this.eventService.searchSpotifyArtist(name).subscribe({
      next: (artist) => {
        if (!artist) {
          this.artistError = 'Artist not found on Spotify';
          this.artistLoading = false;
          this.artistLoaded = true;
          return;
        }

        this.artistInfo = artist;
        console.log('artistLoading =', this.artistLoading);
        console.log('artistError =', this.artistError);
        console.log('artistInfo =', this.artistInfo);
        console.log('follower =', this.artistInfo.followers);
        
        // 2) 再根据 artist id 拿 albums
        this.eventService.getSpotifyArtistAlbums(artist.id).subscribe({
          next: (albums) => {
            this.artistAlbums = albums || [];
            console.log('Artist Albums:', this.artistAlbums);
            this.artistLoading = false;
            this.artistLoaded = true;
          },
          error: (err) => {
            console.error('Failed to load artist albums', err);
            this.artistError = 'Failed to load albums from Spotify';
            this.artistLoading = false;
            this.artistLoaded = true;
          },
        });
      },
      error: (err) => {
        console.error('Failed to search artist from Spotify', err);
        this.artistError = 'Failed to load artist from Spotify';
        this.artistLoading = false;
        this.artistLoaded = true;
      },
    });
  }

  // 分享链接，给 HTML 的 [href] 用
  get facebookShareUrl(): string {
    const url = this.event?.shareUrl || this.event?.buyTicketUrl || '';
    return url
      ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          url
        )}`
      : '';
  }

  get twitterShareUrl(): string {
    const url = this.event?.shareUrl || this.event?.buyTicketUrl || '';
    const text = this.event?.name || 'Check out this event';
    return url
      ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          url
        )}&text=${encodeURIComponent(text)}`
      : '';
  }
}
