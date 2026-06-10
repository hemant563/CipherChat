import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/groups`;

  exploreGroups(): Observable<any> {
    return this.http.get(`${this.apiUrl}/explore`);
  }

  createGroup(data: { name: string; description?: string; type?: string; settings?: any }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  joinGroup(groupId: string): Observable<any> {
    // Assuming no invite link needed for public groups
    return this.http.post(`${this.apiUrl}/${groupId}/join`, { inviteLink: '' });
  }

  getMyGroups(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-groups`);
  }

  updateGroup(groupId: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${groupId}`, data);
  }

  deleteGroup(groupId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${groupId}`);
  }

  removeMember(groupId: string, userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${groupId}/members/${userId}`);
  }

  acceptJoinRequest(groupId: string, userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${groupId}/requests/${userId}/accept`, {});
  }

  rejectJoinRequest(groupId: string, userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${groupId}/requests/${userId}/reject`, {});
  }
}
