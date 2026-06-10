import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { logout } from '../store/auth/auth.actions';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private store = inject(Store);
  private apiUrl = `${environment.apiUrl}/auth`;

  logoutEvent = new Subject<void>();

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data).pipe(
      tap((res: any) => {
        if (res.data?.accessToken) {
          this.setToken(res.data.accessToken);
        }
      })
    );
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data).pipe(
      tap((res: any) => {
        if (res.data?.accessToken) {
          this.setToken(res.data.accessToken);
        }
      })
    );
  }

  requestOtp(email: string, username?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-otp`, { email, username });
  }

  verifyOtp(email: string, otp: string, username?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { email, otp, username }).pipe(
      tap((res: any) => {
        if (res.data?.accessToken) {
          this.setToken(res.data.accessToken);
        }
      })
    );
  }

  resetPassword(username: string, otp: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { username, otp, newPassword });
  }

  checkUsername(username: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-username?username=${username}`);
  }


  setToken(token: string) {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('accessToken', token);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  logout() {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.removeItem('accessToken');
    }
    this.store.dispatch(logout());
    this.logoutEvent.next();
  }
}
