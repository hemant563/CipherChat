import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/users`;

  // Global user state
  public currentUser$ = new BehaviorSubject<any>(this.getInitialState());

  private getInitialState() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('cipherchat_user_profile');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  private setCurrentUser(user: any) {
    if (user) {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('cipherchat_user_profile', JSON.stringify(user));
      }
      this.currentUser$.next(user);
    }
  }

  getAvatarUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace('/api/v1', '')}${url}`;
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`).pipe(
      tap((res: any) => {
        if (res?.data?.user) {
          this.setCurrentUser(res.data.user);
        }
      })
    );
  }

  updateProfile(data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/me`, data).pipe(
      tap((res: any) => {
        if (res?.data?.user) {
          // Merge settings/other fields from current state if backend doesn't return them all
          const current = this.currentUser$.value || {};
          const updated = { ...current, ...res.data.user };
          this.setCurrentUser(updated);
        }
      })
    );
  }
  
  updateSettings(settings: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/me/settings`, settings);
  }

  getUser(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  searchUsers(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/search?q=${query}`);
  }

  getUserProfileByUsername(username: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${username}`);
  }

  blockUser(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/block/${id}`, {});
  }

  unblockUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/block/${id}`);
  }

  sendContactRequest(username: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/contacts/request`, { username });
  }

  getPendingRequests(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/contacts/requests`);
  }



  acceptRequest(id: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/contacts/accept/${id}`, {});
  }

  rejectRequest(id: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/contacts/reject/${id}`, {});
  }

  // --- Chat Lock ---
  setupChatLockPin(pin: string, oldPin?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat-pin/setup`, { pin, oldPin });
  }

  verifyChatLockPin(pin: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat-pin/verify`, { pin });
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/me`);
  }
}
