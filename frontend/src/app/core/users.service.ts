import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrgUser, PaginatedResult } from './models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  list(filters: { page?: number; pageSize?: number } = {}): Observable<PaginatedResult<OrgUser>> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);

    return this.http.get<PaginatedResult<OrgUser>>(this.baseUrl, { params });
  }
}
