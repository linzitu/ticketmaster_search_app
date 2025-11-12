import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { EventService, SearchParams } from '../services/event.service';
import { CommonModule } from '@angular/common';
import { EventItem } from '../models/event';
import { Router } from '@angular/router';
import { LocationService, IpLocation } from '../services/location.service';
import { HttpClient } from '@angular/common/http';
import { FavoriteService } from '../services/favorite.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-search-page',
  standalone: true,
  // 这里一定要把 CommonModule 加进来，ngClass / ngIf 才能用
  imports: [CommonModule, FormsModule],
  templateUrl: './search-page.component.html',
  styleUrls: ['./search-page.component.css'],
})
export class SearchPageComponent implements OnInit { 
  // ====== 表单字段 ======
  keywords = '';
  category = 'all';
  autoDetectLocation = false;   // 默认不开启自动定位
  location = '';
  distance = 10;

  // ====== 结果相关 ======
  events: any[] = [];
  noResults = false;
  isSearching = false;

  // ====== 自动定位状态 ======
  lat: number | null = null;
  lon: number | null = null;
  isLocLoading = false;
  locError: string | null = null;

  // ====== 自动补全 ======//
  suggestions: string[] = [];
  isSuggestionOpen: boolean = false;
  isSuggestLoading: boolean = false;
  suggestTimeout: any;    // 用来简单 debounce

  constructor(private http: HttpClient, private locationService: LocationService, private eventService: EventService, private router: Router, private favoriteService: FavoriteService, private toastService: ToastService) {}
  
  // —— 分类识别：统一成 5 种，其他返回 null 不显示 ——
  getCategoryLabel(ev: any): string | null {
    const raw = this.extractRawCategory(ev).toLowerCase();
    if (!raw) return null;

    if (raw.includes('music')) return 'Music';
    if (raw.includes('sport')) return 'Sports';
    if (raw.includes('arts') && (raw.includes('theatre') || raw.includes('theater'))) {
      return 'Arts & Theatre';
    }
    if (raw.includes('film') || raw.includes('movie')) return 'Film';
    if (raw.includes('misc')) return 'Miscellaneous';

    return null;            // 其他类别不显示
  }

  // 从 Ticketmaster 的各种字段里提取原始类别名字
  private extractRawCategory(ev: any): string {
    if (ev.category) return String(ev.category);

    // 如果你把 classifications 原样传到了前端：
    if (ev.classifications && ev.classifications.length > 0) {
      const cls = ev.classifications[0];
      if (cls.segment?.name) return String(cls.segment.name);
    }
    // 有些人会在后端提前存成 segmentName / segment_name
    if (ev.segmentName) return String(ev.segmentName);
    if (ev.segment_name) return String(ev.segment_name);

    return '';
  }

  // —— 顶部右侧时间 pill：没有时间/日期就不显示 ——
  getDateTimeLabel(ev: any): string | null {
    const date = (ev.date || ev.localDate || '').toString().trim();
    const time = (ev.time || ev.localTime || '').toString().trim();
    const label = [date, time].filter(Boolean).join(', ');
    return label || null;
  }

  // 输入变化时触发
  onKeywordInput(value: string): void {
    this.keywords = value;
  
    // 如果输入被清空，直接收起下拉 & 停止加载
    if (!value || !value.trim()) {
      this.suggestions = [];
      this.isSuggestionOpen = false;
      this.isSuggestLoading = false;
      if (this.suggestTimeout) {
        clearTimeout(this.suggestTimeout);
      }
      return;
    }
  
    // 简单 debounce：300ms 内输入变化就重置定时器
    if (this.suggestTimeout) {
      clearTimeout(this.suggestTimeout);
    }
  
    this.suggestTimeout = setTimeout(() => {
      this.fetchSuggestions(value.trim());
    }, 300);
  }  
  clearKeywords(): void {
    this.keywords = '';
    this.suggestions = [];
    this.isSuggestionOpen = false;
  }
  
  // 真正去后端拿 suggest
  private fetchSuggestions(value: string) {
    this.isSuggestLoading = true;

    this.http
      .get<string[]>('/api/suggest', { params: { keyword: value } })
      .subscribe({
        next: (data) => {
          this.suggestions = (data || []).slice(0, 6);
          this.isSuggestionOpen = this.suggestions.length > 0;
          this.isSuggestLoading = false;
        },
        error: (err) => {
          console.error('suggest error', err);
          this.suggestions = [];
          this.isSuggestionOpen = false;
          this.isSuggestLoading = false;
        },
      });
  }

  // 选择某个建议
  pickSuggestion(item: string) {
    this.keywords = item;
    console.log('Pick suggestion:', item);
    this.isSuggestionOpen = false;
    this.suggestions = [];
  }

  // 输入框失焦时关闭下拉（加一点延时让点击能触发）
  onKeywordBlur() {
    setTimeout(() => {
      this.isSuggestionOpen = false;
    }, 200);
  }

  // 获取焦点时，如果有结果就展示
  onKeywordFocus() {
    if (this.suggestions.length > 0) {
      this.isSuggestionOpen = true;
    }
  }

  // 🌟 组件创建时，尝试从 service 恢复上次搜索
  ngOnInit(): void {
    const cache = this.eventService.getLastSearch();
    if (cache) {
      const { params, results } = cache;

      this.keywords = params.keywords;
      this.category = params.category;
      this.location = params.location;
      this.distance = params.distance;
      this.autoDetectLocation = params.autoDetectLocation;

      // 如果之前已经有自动定位结果，一起恢复
      this.lat = (params as any).lat ?? null;
      this.lon = (params as any).lon ?? null;

      this.events = results;
      this.noResults = results.length === 0;
    } else if (this.autoDetectLocation) {
      // 第一次进入页面且默认是自动定位，就取一次位置
      this.fetchLocation();
    }
  }

  // 格式化右上角日期时间，比如 "Nov 17, 08:00 PM"
  formatEventDate(ev: any): string {
    const date = ev.date || '';
    const time = ev.time || '';

    if (!date && !time) {
      return '';
    }

    // 尝试拼成一个可解析的时间字符串
    let dt: Date | null = null;

    if (date && time) {
      dt = new Date(`${date}T${time}`);
    } else if (date) {
      dt = new Date(date);
    }

    if (!dt || isNaN(dt.getTime())) {
      // 解析失败就直接拼原始字符串兜底
      return `${date} ${time}`.trim();
    }

    return dt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  // 列表页：点击收藏/取消收藏
  toggleFavorite(ev: EventItem, e: MouseEvent): void {
    event.stopPropagation(); // 防止点爱心就跳详情

    this.favoriteService.toggleFavorite(ev);

    // 这里如果你有 toast，也可以像以前那样区分是 add 还是 remove
    if (this.favoriteService.isFavorite(ev.id)) {
      this.toastService.show({
        type: 'success',
        message: `${ev.name} added to favorites!`
      });
    } else {
      this.toastService.show({
        type: 'info', // ✅ 改成 info，这样右侧会显示 Undo 按钮
        message: `${ev.name} removed from favorites!`,
        actionText: 'Undo', // ✅ 加上 Undo
        onAction: () => {
          this.favoriteService.addFavorite(ev);
          this.toastService.show({
            type: 'success',
            message: `${ev.name} added back to favorites!`
          });
        }
      });
    }    
  }
  
  // 模板用来判断某个 event 是否已收藏
  isFavorite(event: EventItem): boolean {
    return this.favoriteService.isFavorite(event.id);
  }
  // 勾选 / 取消勾选 自动定位
  onAutoDetectChange(): void {
    if (this.autoDetectLocation) {
      // 从手动 -> 自动：清空手动地址，开始定位
      this.location = '';
      this.fetchLocation();
    } else {
      // 从自动 -> 手动：清空自动定位相关状态
      this.lat = null;
      this.lon = null;
      this.isLocLoading = false;
      this.locError = null;
    }
  }

  // 调后端 /api/ip-location 获取经纬度
  fetchLocation(): void {
    this.isLocLoading = true;
    this.locError = null;

    this.locationService.getIpLocation().subscribe({
      next: (loc: IpLocation) => {
        this.lat = loc.lat;
        this.lon = loc.lon;
        this.isLocLoading = false;
        console.log('Auto-detected location:', loc);
      },
      error: (err) => {
        console.error('getIpLocation error', err);
        this.isLocLoading = false;
        this.locError =
          'Failed to auto-detect location. Please enter it manually.';
        // 自动定位失败，关掉开关，恢复手动输入
        this.autoDetectLocation = false;
      },
    });
  }

  // 点击 Search 触发
  onSearch(form: NgForm): void {
    if (form.invalid) {
      Object.values(form.controls).forEach((control) =>
        control.markAsTouched()
      );
      return;
    }

    // 如果开启自动定位但还没有拿到坐标，先不允许搜索
    if (this.autoDetectLocation && (this.lat === null || this.lon === null)) {
      this.locError = 'Detecting location, please try again in a moment.';
      return;
    }

    // 把前端 SearchParams 转成后端 /api/events 的 query 参数
    const payload: SearchParams = {
      keywords: this.keywords.trim(),
      category: this.category,
      // 自动定位时，不再使用 location 文本字段
      location: this.autoDetectLocation ? '' : this.location.trim(),
      distance: this.distance,
      autoDetectLocation: this.autoDetectLocation,
      // 🌟 新增：把经纬度也传给后端（在 SearchParams 里定义为可选字段）
      lat: this.autoDetectLocation ? this.lat : null,
      lon: this.autoDetectLocation ? this.lon : null,
    };

    this.isSearching = true;

    this.eventService.searchEvents(payload).subscribe({
      next: (events) => {
        this.events = events;
        this.noResults = events.length === 0;
        this.isSearching = false;

        // 搜索成功后把条件 + 结果存起来
        this.eventService.saveLastSearch(payload, events);
      },
      error: (err) => {
        console.error('Search error', err);
        this.events = [];
        this.noResults = true;
        this.isSearching = false;

        this.eventService.saveLastSearch(payload, []);
      },
    });

    console.log('Searching for events with:', payload);
  }

  // 点击卡片跳转详情
  goToDetail(id: string) {
    this.router.navigate(['/details', id]);
  }
}
