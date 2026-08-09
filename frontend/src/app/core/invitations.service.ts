import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AttemptWithQuestions, Invitation, InvitationPublicView } from './models';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // --- Lado reclutador (requiere sesión, ver authInterceptor) ---

  create(
    assessmentId: string,
    payload: { candidateName?: string; candidateEmail?: string; expiresInDays?: number },
  ): Observable<Invitation> {
    return this.http.post<Invitation>(
      `${this.apiUrl}/assessments/${assessmentId}/invitations`,
      payload,
    );
  }

  listForAssessment(assessmentId: string): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.apiUrl}/assessments/${assessmentId}/invitations`);
  }

  // --- Lado candidato (público, sin sesión) ---

  getByToken(token: string): Observable<InvitationPublicView> {
    return this.http.get<InvitationPublicView>(`${this.apiUrl}/invitations/${token}`);
  }

  start(token: string, candidateName: string): Observable<AttemptWithQuestions> {
    return this.http.post<AttemptWithQuestions>(`${this.apiUrl}/invitations/${token}/start`, {
      candidateName,
    });
  }
}
