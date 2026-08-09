import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ContentVisibility, QuestionBank, QuestionBankDetail } from './models';

@Injectable({ providedIn: 'root' })
export class QuestionBanksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/question-banks`;

  list(): Observable<QuestionBank[]> {
    return this.http.get<QuestionBank[]>(this.baseUrl);
  }

  get(id: string): Observable<QuestionBankDetail> {
    return this.http.get<QuestionBankDetail>(`${this.baseUrl}/${id}`);
  }

  create(payload: { name: string; description?: string; visibility?: ContentVisibility }): Observable<QuestionBank> {
    return this.http.post<QuestionBank>(this.baseUrl, payload);
  }

  update(
    id: string,
    payload: { name?: string; description?: string; visibility?: ContentVisibility },
  ): Observable<QuestionBank> {
    return this.http.put<QuestionBank>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addQuestions(bankId: string, questionIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${bankId}/questions`, { questionIds });
  }

  removeQuestion(bankId: string, questionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${bankId}/questions/${questionId}`);
  }
}
