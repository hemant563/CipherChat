import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <div *ngFor="let toast of toastService.toasts()" 
           class="pointer-events-auto min-w-[300px] max-w-sm rounded-xl shadow-xl flex items-center p-4 gap-3 transform transition-all duration-300 animate-slideInRight"
           [ngClass]="{
             'bg-surface-white border border-border-subtle': true
           }">
        
        <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full"
             [ngClass]="{
               'bg-success-green/10 text-success-green': toast.type === 'success',
               'bg-error/10 text-error': toast.type === 'error',
               'bg-primary/10 text-primary': toast.type === 'info',
               'bg-orange-500/10 text-orange-500': toast.type === 'warning'
             }">
          <span class="material-symbols-outlined text-[20px]">{{ getIcon(toast.type) }}</span>
        </div>
        
        <div class="flex-grow">
          <p class="font-label-md text-sm text-text-primary font-bold">
            {{ getTitle(toast.type) }}
          </p>
          <p class="text-sm text-text-secondary mt-0.5 leading-tight">
            {{ toast.message }}
          </p>
        </div>
        
        <button (click)="toastService.remove(toast.id)" class="text-on-surface-variant hover:text-text-primary transition-colors flex-shrink-0 p-1 rounded-full hover:bg-surface-container">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100%) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    .animate-slideInRight {
      animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': default: return 'info';
    }
  }

  getTitle(type: string): string {
    switch (type) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      case 'info': default: return 'Info';
    }
  }
}
