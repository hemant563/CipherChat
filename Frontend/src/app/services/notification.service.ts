import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private settingsService = inject(SettingsService);
  private router = inject(Router);

  requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // Success
        } else {
          // If denied, we should probably turn off the setting in the UI
          this.settingsService.updateSettings({ desktopAlerts: false });
        }
      });
    } else if (Notification.permission === 'denied') {
      this.settingsService.updateSettings({ desktopAlerts: false });
    }
  }

  showDesktopNotification(title: string, options?: NotificationOptions, onClickRoute?: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (!this.settingsService.desktopAlerts()) {
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/logo.png', // Assuming logo.png is in public folder
        ...options
      });

      notification.onclick = () => {
        window.focus(); // Focus the browser tab
        if (onClickRoute) {
          this.router.navigateByUrl(onClickRoute);
        }
        notification.close();
      };
    } else if (Notification.permission !== 'denied') {
      // Try to request if they haven't explicitly denied
      this.requestPermission();
    }
  }

  notifyNewMessage(senderName: string, messageText: string, chatId: string) {
    this.showDesktopNotification(`New Message from ${senderName}`, {
      body: messageText,
      tag: `chat-${chatId}`
    }, `/chat`);
  }

  notifyIncomingCall(callerName: string, isVideo: boolean) {
    this.showDesktopNotification(`Incoming ${isVideo ? 'Video' : 'Audio'} Call`, {
      body: `${callerName} is calling you.`,
      tag: 'incoming-call',
      requireInteraction: true // Keeps notification open until clicked or dismissed
    }, `/chat`);
  }

  notifyMissedCall(callerName: string) {
    this.showDesktopNotification(`Missed Call`, {
      body: `You missed a call from ${callerName}.`,
      tag: 'missed-call'
    }, `/chat`);
  }
}
