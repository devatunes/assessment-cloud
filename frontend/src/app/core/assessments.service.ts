import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Assessment, AssessmentLevelThresholds, AssessmentVisibility, PaginatedResult } from './models';

@Injectable({ providedIn: 'root' })
export class AssessmentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/assessments`;

  list(filters: { page?: number; pageSize?: number } = {}): Observable<PaginatedResult<Assessment>> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);

    return this.http.get<PaginatedResult<Assessment>>(this.baseUrl, { params });
  }

  get(id: string): Observable<Assessment> {
    return this.http.get<Assessment>(`${this.baseUrl}/${id}`);
  }

  create(payload: {
    name: string;
    description?: string;
    questionIds: string[];
    visibility?: AssessmentVisibility;
    levelThresholds?: AssessmentLevelThresholds;
    timeLimitMinutes?: number;
  }): Observable<Assessment> {
    return this.http.post<Assessment>(this.baseUrl, payload);
  }

  update(
    id: string,
    payload: Partial<{
      name: string;
      description: string;
      questionIds: string[];
      visibility: AssessmentVisibility;
      levelThresholds: AssessmentLevelThresholds;
      timeLimitMinutes: number;
    }>,
  ): Observable<Assessment> {
    return this.http.put<Assessment>(`${this.baseUrl}/${id}`, payload);
  }
}
