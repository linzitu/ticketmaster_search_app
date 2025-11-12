// src/app/services/toast.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastType = 'success' | 'info';

export interface ToastData {
  message: string;
  subMessage?: string;
  type?: ToastType;
  actionText?: string;   // 比如 "Undo"
  duration?: number;     // 毫秒，默认 3000
  onAction?: () => void; // 点 Undo 时要执行的逻辑
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastData | null>();
  toast$ = this.toastSubject.asObservable();

  show(config: ToastData) {
    this.toastSubject.next(config);
  }

  clear() {
    this.toastSubject.next(null);
  }
}
