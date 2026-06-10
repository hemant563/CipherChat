import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chats`;

  getRecentConversations(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getMessages(chatId: string, queryParams: string = ''): Observable<any> {
    return this.http.get(`${this.apiUrl}/${chatId}/messages${queryParams}`);
  }

  getSmartReplies(messages: any[]): Observable<any> {
    return this.http.post(`${environment.apiUrl}/ai/smart-replies`, { messages });
  }

  toggleChatLock(chatId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${chatId}/toggle-lock`, {});
  }

  clearChat(chatId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${chatId}/messages`);
  }
}
