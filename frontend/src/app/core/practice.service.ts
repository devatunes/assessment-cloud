import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AttemptWithQuestions, PracticeAttemptSummary, PracticeCatalogEntry } from './models';

@Injectable({ providedIn: 'root' })
export class PracticeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/practice`;

  listCatalog(): Observable<PracticeCatalogEntry[]> {
    return this.http.get<PracticeCatalogEntry[]>(`${this.baseUrl}/assessments`);
  }

  // Inicia (o retoma, si ya había uno IN_PROGRESS) un intento de práctica.
  // Devuelve lo mismo que el wizard /attempt/:id ya consume — se reutiliza
  // tal cual, sin duplicar esa pantalla para el flujo de simulacro.
  start(assessmentId: string): Observable<AttemptWithQuestions> {
    return this.http.post<AttemptWithQuestions>(`${this.baseUrl}/assessments/${assessmentId}/start`, {});
  }

  myAttempts(): Observable<PracticeAttemptSummary[]> {
    return this.http.get<PracticeAttemptSummary[]>(`${this.baseUrl}/my-attempts`);
  }
}
