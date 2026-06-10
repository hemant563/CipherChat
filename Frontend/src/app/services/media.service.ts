import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private http = inject(HttpClient);

  uploadMedia(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('iv', 'dummy_iv_for_now');
    formData.append('key', 'dummy_key_for_now');
    return this.http.post(`${environment.apiUrl}/media/upload`, formData);
  }
}
