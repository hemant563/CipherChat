import { Injectable, inject, signal } from '@angular/core';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private socketService = inject(SocketService);
  
  // Dictionary mapping userId to true (online) or false (offline)
  private onlineUsers = signal<{ [userId: string]: boolean }>({});
  
  // Dictionary mapping userId to lastSeen Date string
  private lastSeen = signal<{ [userId: string]: string }>({});

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    this.socketService.onUserPresence((data: any) => {
      // Data contains: { userId, status, lastSeen }
      // status can be 'online' or 'offline'
      if (data.status === 'online') {
        this.onlineUsers.update(users => ({ ...users, [data.userId]: true }));
      } else {
        this.onlineUsers.update(users => ({ ...users, [data.userId]: false }));
        if (data.lastSeen) {
          this.lastSeen.update(ls => ({ ...ls, [data.userId]: data.lastSeen }));
        }
      }
    });
  }

  /**
   * Initialize a user's status based on initial API load.
   * If the API returns isOnline=true, we register them as online.
   */
  initializeStatus(userId: string, isOnline: boolean, lastSeenDate?: string) {
    if (isOnline) {
      this.onlineUsers.update(users => ({ ...users, [userId]: true }));
    } else {
      this.onlineUsers.update(users => ({ ...users, [userId]: false }));
      if (lastSeenDate) {
        this.lastSeen.update(ls => ({ ...ls, [userId]: lastSeenDate }));
      }
    }
  }

  isOnline(userId: string | undefined): boolean {
    if (!userId) return false;
    return !!this.onlineUsers()[userId];
  }

  getLastSeen(userId: string | undefined): string | null {
    if (!userId) return null;
    return this.lastSeen()[userId] || null;
  }
}
