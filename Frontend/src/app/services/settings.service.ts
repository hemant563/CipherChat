import { Injectable, signal } from '@angular/core';

export interface NotificationSettings {
  messageTone: string;
  hapticFeedback: boolean;
  desktopAlerts: boolean;
  callRingtoneMuted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  // Signals for reactive settings
  messageTone = signal<string>('Default (Pop)');
  hapticFeedback = signal<boolean>(true);
  desktopAlerts = signal<boolean>(false);
  callRingtoneMuted = signal<boolean>(false);

  constructor() {
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notificationSettings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.messageTone) this.messageTone.set(parsed.messageTone);
          if (typeof parsed.hapticFeedback === 'boolean') this.hapticFeedback.set(parsed.hapticFeedback);
          if (typeof parsed.desktopAlerts === 'boolean') this.desktopAlerts.set(parsed.desktopAlerts);
          if (typeof parsed.callRingtoneMuted === 'boolean') this.callRingtoneMuted.set(parsed.callRingtoneMuted);
        } catch (e) {
          console.error('Failed to parse settings from local storage');
        }
      }
    }
  }

  updateSettings(settings: Partial<NotificationSettings>) {
    if (settings.messageTone !== undefined) this.messageTone.set(settings.messageTone);
    if (settings.hapticFeedback !== undefined) this.hapticFeedback.set(settings.hapticFeedback);
    if (settings.desktopAlerts !== undefined) this.desktopAlerts.set(settings.desktopAlerts);
    if (settings.callRingtoneMuted !== undefined) this.callRingtoneMuted.set(settings.callRingtoneMuted);

    if (typeof window !== 'undefined') {
      localStorage.setItem('notificationSettings', JSON.stringify({
        messageTone: this.messageTone(),
        hapticFeedback: this.hapticFeedback(),
        desktopAlerts: this.desktopAlerts(),
        callRingtoneMuted: this.callRingtoneMuted()
      }));
    }
  }

  getSettings(): NotificationSettings {
    return {
      messageTone: this.messageTone(),
      hapticFeedback: this.hapticFeedback(),
      desktopAlerts: this.desktopAlerts(),
      callRingtoneMuted: this.callRingtoneMuted()
    };
  }
}
