import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Assessment, AssessmentLevelThresholds, AssessmentVisibility } from './models';

@Injectable({ providedIn: 'root' })
export class AssessmentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/assessments`;

  list(): Observable<Assessment[]> {
    return this.http.get<Assessment[]>(this.baseUrl);
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
  }): Observable<Assessment> {
    return this.http.post<Assessment>(this.baseUrl, payload);
  }
}
