import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AttemptWithQuestions,
  BulkInvitationResult,
  BulkInvitationRow,
  Invitation,
  InvitationPublicView,
  InvitationTrack,
} from './models';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // --- Lado reclutador (requiere sesión, ver authInterceptor) ---

  create(
    assessmentId: string,
    payload: {
      candidateName?: string;
      candidateEmail?: string;
      expiresInDays?: number;
      track?: InvitationTrack;
      specialty?: string;
    },
  ): Observable<Invitation> {
    return this.http.post<Invitation>(
      `${this.apiUrl}/assessments/${assessmentId}/invitations`,
      payload,
    );
  }

  listForAssessment(assessmentId: string): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.apiUrl}/assessments/${assessmentId}/invitations`);
  }

  // Importación masiva desde un CSV parseado en el navegador (ver
  // assessment-invite.component). Una fila mal formada no revierte el lote:
  // el resultado trae por separado lo creado y lo fallido.
  createBulk(assessmentId: string, rows: BulkInvitationRow[]): Observable<BulkInvitationResult> {
    return this.http.post<BulkInvitationResult>(
      `${this.apiUrl}/assessments/${assessmentId}/invitations/bulk`,
      { invitations: rows },
    );
  }

  // El track/especialidad se puede reasignar después de generada la invitación.
  updateClassification(
    assessmentId: string,
    invitationId: string,
    payload: { track?: InvitationTrack; specialty?: string },
  ): Observable<Invitation> {
    return this.http.patch<Invitation>(
      `${this.apiUrl}/assessments/${assessmentId}/invitations/${invitationId}`,
      payload,
    );
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
