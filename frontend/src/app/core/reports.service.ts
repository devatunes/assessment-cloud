import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AssessmentReport, OrganizationOverview } from './models';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAssessmentReport(assessmentId: string): Observable<AssessmentReport> {
    return this.http.get<AssessmentReport>(`${this.baseUrl}/assessments/${assessmentId}/report`);
  }

  getOverview(): Observable<OrganizationOverview> {
    return this.http.get<OrganizationOverview>(`${this.baseUrl}/reports/overview`);
  }

  // El endpoint exige el Bearer del staff de organización, así que no se
  // puede descargar con un <a href> simple (el navegador no lo adjuntaría);
  // se pide como blob vía HttpClient (el interceptor sí le pone el header)
  // y el componente arma la descarga con un link temporal.
  exportCsv(assessmentId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/assessments/${assessmentId}/report/export.csv`, {
      responseType: 'blob',
    });
  }
}
