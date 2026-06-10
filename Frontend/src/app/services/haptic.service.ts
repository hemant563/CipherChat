import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class HapticService {
  private settingsService = inject(SettingsService);

  vibrateMessage() {
    this.vibrate([100]);
  }

  vibrateIncomingCall() {
    this.vibrate([200, 100, 200]);
  }

  vibrateCallAccepted() {
    this.vibrate([50, 50, 50]);
  }

  vibrateCallEnded() {
    this.vibrate([150]);
  }

  vibrateImportantAction() {
    this.vibrate([50, 100, 50]);
  }

  private vibrate(pattern: number | number[]) {
    if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) {
      // Fail gracefully on desktop browsers that do not support vibration
      return;
    }

    if (!this.settingsService.hapticFeedback()) {
      return;
    }

    try {
      window.navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration API failed', e);
    }
  }
}
