import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AttemptResult, AttemptWithQuestions, RunResult } from './models';

@Injectable({ providedIn: 'root' })
export class AttemptsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/attempts`;

  start(payload: { assessmentId: string; candidateName: string }): Observable<AttemptWithQuestions> {
    return this.http.post<AttemptWithQuestions>(this.baseUrl, payload);
  }

  get(id: string): Observable<AttemptWithQuestions> {
    return this.http.get<AttemptWithQuestions>(`${this.baseUrl}/${id}`);
  }

  submitAnswer(
    attemptId: string,
    questionId: string,
    payload: { selectedOptionId?: string; code?: string },
  ): Observable<{ saved: true }> {
    return this.http.put<{ saved: true }>(
      `${this.baseUrl}/${attemptId}/answers/${questionId}`,
      payload,
    );
  }

  runCode(attemptId: string, questionId: string, code: string): Observable<RunResult> {
    return this.http.post<RunResult>(
      `${this.baseUrl}/${attemptId}/questions/${questionId}/run`,
      { code },
    );
  }

  finish(attemptId: string): Observable<AttemptResult> {
    return this.http.post<AttemptResult>(`${this.baseUrl}/${attemptId}/finish`, {});
  }

  // Lectura pura del resultado (no finaliza el intento). El backend responde
  // 400 si el intento todavía está IN_PROGRESS — ver AttemptResultComponent.
  getResult(attemptId: string): Observable<AttemptResult> {
    return this.http.get<AttemptResult>(`${this.baseUrl}/${attemptId}/result`);
  }
}
