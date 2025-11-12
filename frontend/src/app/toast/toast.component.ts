// src/app/toast/toast.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastData } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
})
export class ToastComponent implements OnInit, OnDestroy {
  visible = false;
  data: ToastData | null = null;

  private sub?: Subscription;
  private hideTimeoutId: any;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.toast$.subscribe((config) => {
      if (!config) {
        this.hide();
        return;
      }
      this.data = config;
      this.visible = true;

      if (this.hideTimeoutId) {
        clearTimeout(this.hideTimeoutId);
      }
      const duration = config.duration ?? 2000;
      this.hideTimeoutId = setTimeout(() => this.hide(), duration);
    });
  }

  hide(): void {
    this.visible = false;
    this.data = null;
  }

  onActionClick(): void {
    if (this.data?.onAction) {
      this.data.onAction();
    }
    this.hide();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
    }
  }
}
