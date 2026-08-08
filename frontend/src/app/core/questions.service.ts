import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateQuestionPayload, Question, QuestionDifficulty, QuestionType } from './models';

@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/questions`;

  list(filters: { category?: string; difficulty?: QuestionDifficulty; type?: QuestionType }): Observable<Question[]> {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters.type) params = params.set('type', filters.type);

    return this.http.get<Question[]>(this.baseUrl, { params });
  }

  create(payload: CreateQuestionPayload): Observable<Question> {
    return this.http.post<Question>(this.baseUrl, payload);
  }
}
