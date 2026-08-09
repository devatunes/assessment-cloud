import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CandidateAuthResponse, CurrentCandidate } from './models';

const TOKEN_KEY = 'assessment_cloud_candidate_token';
const CANDIDATE_KEY = 'assessment_cloud_candidate_user';

// Auth de candidatos que se registran solos para practicar. Sistema
// completamente separado del staff de organización (ver auth.service.ts):
// otro token, otra clave de localStorage, nunca se mezclan (ver también
// candidate-auth.interceptor.ts).
@Injectable({ providedIn: 'root' })
export class CandidateAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/candidate-auth`;

  readonly currentCandidate = signal<CurrentCandidate | null>(this.loadFromStorage());

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return this.currentCandidate() !== null;
  }

  login(email: string, password: string): Observable<CandidateAuthResponse> {
    return this.http
      .post<CandidateAuthResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res) => this.persistSession(res)));
  }

  register(payload: { name: string; email: string; password: string }): Observable<CandidateAuthResponse> {
    return this.http
      .post<CandidateAuthResponse>(`${this.baseUrl}/register`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CANDIDATE_KEY);
    this.currentCandidate.set(null);
  }

  private persistSession(res: CandidateAuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(CANDIDATE_KEY, JSON.stringify(res.candidate));
    this.currentCandidate.set(res.candidate);
  }

  private loadFromStorage(): CurrentCandidate | null {
    const raw = localStorage.getItem(CANDIDATE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentCandidate;
    } catch {
      return null;
    }
  }
}
