import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AttemptWithQuestions,
  EarnedBadge,
  PaginatedResult,
  PracticeAttemptSummary,
  PracticeCatalogEntry,
} from './models';

@Injectable({ providedIn: 'root' })
export class PracticeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/practice`;

  listCatalog(filters: { page?: number; pageSize?: number } = {}): Observable<PaginatedResult<PracticeCatalogEntry>> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);

    return this.http.get<PaginatedResult<PracticeCatalogEntry>>(`${this.baseUrl}/assessments`, { params });
  }

  // Inicia (o retoma, si ya había uno IN_PROGRESS) un intento de práctica.
  // Devuelve lo mismo que el wizard /attempt/:id ya consume — se reutiliza
  // tal cual, sin duplicar esa pantalla para el flujo de simulacro.
  start(assessmentId: string): Observable<AttemptWithQuestions> {
    return this.http.post<AttemptWithQuestions>(`${this.baseUrl}/assessments/${assessmentId}/start`, {});
  }

  myAttempts(filters: { page?: number; pageSize?: number } = {}): Observable<PaginatedResult<PracticeAttemptSummary>> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);

    return this.http.get<PaginatedResult<PracticeAttemptSummary>>(`${this.baseUrl}/my-attempts`, { params });
  }

  myBadges(): Observable<EarnedBadge[]> {
    return this.http.get<EarnedBadge[]>(`${this.baseUrl}/my-badges`);
  }
}
