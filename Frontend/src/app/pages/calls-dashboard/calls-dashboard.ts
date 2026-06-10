import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CallService } from '../../services/call.service';
import { UserService } from '../../services/user.service';
import { SettingsService } from '../../services/settings.service';

export interface CallRecord {
  _id: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'ongoing' | 'ended' | 'missed' | 'rejected';
  caller: any;
  recipient: any;
  createdAt: string;
  duration?: number;
}

@Component({
  selector: 'app-calls-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calls-dashboard.html',
  styleUrl: './calls-dashboard.css',
})
export class CallsDashboard implements OnInit {
  private http = inject(HttpClient);
  private callService = inject(CallService);
  private userService = inject(UserService);
  private router = inject(Router);
  private settingsService = inject(SettingsService);

  callFilter = signal<'All' | 'Missed'>('All');
  isRingtoneMuted = this.settingsService.callRingtoneMuted;
  showOlderHistory = signal(false);
  callHistory = signal<CallRecord[]>([]);
  myUserId = signal<string>('');

  totalDuration = computed(() => {
    const totalSeconds = this.callHistory().reduce((acc, call) => acc + (call.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  });

  answeredCallsCount = computed(() => {
    return this.callHistory().filter(c => c.status === 'ended' && c.caller._id !== this.myUserId()).length;
  });

  missedCallsCount = computed(() => {
    return this.callHistory().filter(c => c.status === 'missed' && c.caller._id !== this.myUserId()).length;
  });

  outgoingCallsCount = computed(() => {
    return this.callHistory().filter(c => c.caller._id === this.myUserId()).length;
  });

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.userService.currentUser$.subscribe(user => {
        if (user) {
          const isFirstLoad = !this.myUserId();
          this.myUserId.set(user._id);
          if (isFirstLoad) {
            this.loadCallHistory();
          }
        }
      });
      this.userService.getProfile().subscribe();
    }
  }

  loadCallHistory() {
    this.http.get(`${environment.apiUrl}/calls/history`).subscribe({
      next: (res: any) => {
        this.callHistory.set(res.data.calls);
      },
      error: (err) => console.error('Failed to load call history', err)
    });
  }

  setFilter(filter: 'All' | 'Missed') {
    this.callFilter.set(filter);
  }

  toggleOlderHistory() {
    this.showOlderHistory.update(v => !v);
  }

  callBack(call: CallRecord, type: 'audio' | 'video') {
    const isCaller = call.caller._id === this.myUserId();
    const targetUser = isCaller ? call.recipient : call.caller;
    if (targetUser) {
      this.callService.startCall(targetUser._id, targetUser, type);
    }
  }

  goToSettings() {
    this.router.navigate(['/profile']);
  }

  toggleRingtone() {
    this.settingsService.updateSettings({
      callRingtoneMuted: !this.isRingtoneMuted()
    });
  }
}
