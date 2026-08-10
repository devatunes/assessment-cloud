import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateQuestionPayload,
  PaginatedResult,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
} from './models';

@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/questions`;

  list(filters: {
    category?: QuestionCategory;
    difficulty?: QuestionDifficulty;
    type?: QuestionType;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedResult<Question>> {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);

    return this.http.get<PaginatedResult<Question>>(this.baseUrl, { params });
  }

  get(id: string): Observable<Question> {
    return this.http.get<Question>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateQuestionPayload): Observable<Question> {
    return this.http.post<Question>(this.baseUrl, payload);
  }

  update(id: string, payload: CreateQuestionPayload): Observable<Question> {
    return this.http.put<Question>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Copia una pregunta pública de otra organización a la biblioteca propia,
  // para poder editarla (el original nunca se modifica).
  duplicate(id: string): Observable<Question> {
    return this.http.post<Question>(`${this.baseUrl}/${id}/duplicate`, {});
  }
}
