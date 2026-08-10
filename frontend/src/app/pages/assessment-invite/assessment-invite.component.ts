import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AssessmentsService } from '../../core/assessments.service';
import { InvitationsService } from '../../core/invitations.service';
import { ReportsService } from '../../core/reports.service';
import {
  Assessment,
  BulkInvitationResult,
  BulkInvitationRow,
  CandidateHistoryGroup,
  INVITATION_TRACK_LABELS,
  Invitation,
  InvitationTrack,
} from '../../core/models';
import { PaginatorComponent } from '../../shared/paginator.component';

@Component({
  selector: 'app-assessment-invite',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginatorComponent],
  templateUrl: './assessment-invite.component.html',
})
export class AssessmentInviteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly assessmentsService = inject(AssessmentsService);
  private readonly invitationsService = inject(InvitationsService);
  private readonly reportsService = inject(ReportsService);

  readonly tracks = Object.keys(INVITATION_TRACK_LABELS) as InvitationTrack[];
  readonly trackLabels = INVITATION_TRACK_LABELS;
  readonly pageSize = 20;

  assessment: Assessment | null = null;
  invitations: Invitation[] = [];
  loading = false;
  error: string | null = null;
  invitationsPage = 1;
  invitationsTotal = 0;

  candidateName = '';
  candidateEmail = '';
  expiresInDays: number | null = null;
  track: InvitationTrack | '' = '';
  specialty = '';
  creating = false;
  lastCreatedLink: string | null = null;
  copied = false;

  // Edición de track/especialidad de una invitación ya generada.
  editingId: string | null = null;
  editTrack: InvitationTrack | '' = '';
  editSpecialty = '';
  savingEdit = false;

  // Importación masiva por CSV: encabezado esperado "nombre,email,track,especialidad"
  // (track y especialidad opcionales; track debe ser DEVELOPER/QA/OTHER o se ignora).
  csvRows: BulkInvitationRow[] = [];
  csvError: string | null = null;
  csvResult: BulkInvitationResult | null = null;
  importingCsv = false;

  // Selección de candidatos que ya aparecen en el historial de la
  // organización (/candidates), para invitarlos a este assessment sin
  // volver a teclear nombre/correo — se les precarga su track/especialidad
  // más reciente, editable en el próximo paso desde la tabla de invitaciones.
  showCandidatePicker = false;
  loadingCandidates = false;
  candidateError: string | null = null;
  candidateResult: BulkInvitationResult | null = null;
  availableCandidateGroups: CandidateHistoryGroup[] = [];
  selectedCandidateEmails = new Set<string>();
  invitingSelected = false;

  private assessmentId = '';

  ngOnInit(): void {
    this.assessmentId = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;

    this.assessmentsService.get(this.assessmentId).subscribe({
      next: (assessment) => {
        this.assessment = assessment;
        this.loadInvitations();
      },
      error: () => {
        this.error = 'No se pudo cargar el assessment';
        this.loading = false;
      },
    });
  }

  loadInvitations(onComplete?: () => void): void {
    this.invitationsService
      .listForAssessment(this.assessmentId, { page: this.invitationsPage, pageSize: this.pageSize })
      .subscribe({
        next: (result) => {
          this.invitations = result.items;
          this.invitationsTotal = result.total;
          this.loading = false;
          onComplete?.();
        },
        error: () => {
          this.error = 'No se pudieron cargar las invitaciones';
          this.loading = false;
        },
      });
  }

  onInvitationsPageChange(page: number): void {
    this.invitationsPage = page;
    this.loadInvitations();
  }

  buildLink(token: string): string {
    return `${window.location.origin}/invite/${token}`;
  }

  createInvitation(): void {
    this.error = null;

    if (!this.candidateEmail) {
      this.error = 'El correo del candidato es obligatorio';
      return;
    }

    this.creating = true;
    this.lastCreatedLink = null;
    this.copied = false;

    this.invitationsService
      .create(this.assessmentId, {
        candidateName: this.candidateName || undefined,
        candidateEmail: this.candidateEmail || undefined,
        expiresInDays: this.expiresInDays || undefined,
        track: this.track || undefined,
        specialty: this.specialty || undefined,
      })
      .subscribe({
        next: (invitation) => {
          this.creating = false;
          this.lastCreatedLink = this.buildLink(invitation.token);
          this.candidateName = '';
          this.candidateEmail = '';
          this.expiresInDays = null;
          this.track = '';
          this.specialty = '';
          this.invitationsPage = 1;
          this.loadInvitations();
        },
        error: () => {
          this.creating = false;
          this.error = 'No se pudo generar la invitación';
        },
      });
  }

  copyLink(link: string): void {
    navigator.clipboard.writeText(link).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  startEdit(invitation: Invitation): void {
    this.editingId = invitation.id;
    this.editTrack = invitation.track ?? '';
    this.editSpecialty = invitation.specialty ?? '';
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(invitation: Invitation): void {
    this.savingEdit = true;
    this.invitationsService
      .updateClassification(this.assessmentId, invitation.id, {
        track: this.editTrack || undefined,
        specialty: this.editSpecialty || undefined,
      })
      .subscribe({
        next: () => {
          this.savingEdit = false;
          this.editingId = null;
          this.loadInvitations();
        },
        error: () => {
          this.savingEdit = false;
          this.error = 'No se pudo actualizar la clasificación';
        },
      });
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo después

    if (!file) return;

    this.csvResult = null;
    const reader = new FileReader();
    reader.onload = () => this.parseCsv(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  importCsv(): void {
    if (this.csvRows.length === 0) return;

    this.importingCsv = true;
    this.csvError = null;

    this.invitationsService.createBulk(this.assessmentId, this.csvRows).subscribe({
      next: (result) => {
        this.importingCsv = false;
        this.csvResult = result;
        this.csvRows = [];
        this.invitationsPage = 1;
        this.loadInvitations();
      },
      error: () => {
        this.importingCsv = false;
        this.csvError = 'No se pudo importar el archivo';
      },
    });
  }

  clearCsv(): void {
    this.csvRows = [];
    this.csvError = null;
    this.csvResult = null;
  }

  toggleCandidatePicker(): void {
    this.showCandidatePicker = !this.showCandidatePicker;
    this.candidateError = null;
    this.candidateResult = null;
    this.selectedCandidateEmails.clear();

    if (this.showCandidatePicker) {
      this.loadAvailableCandidates();
    }
  }

  toggleCandidateSelected(email: string): void {
    if (this.selectedCandidateEmails.has(email)) {
      this.selectedCandidateEmails.delete(email);
    } else {
      this.selectedCandidateEmails.add(email);
    }
  }

  inviteSelectedCandidates(): void {
    if (this.selectedCandidateEmails.size === 0) return;

    const rows: BulkInvitationRow[] = this.availableCandidateGroups
      .filter((group) => this.selectedCandidateEmails.has(group.email))
      .map((group) => {
        const latest = group.entries[0];
        return {
          candidateName: group.name || undefined,
          candidateEmail: group.email,
          track: latest?.track ?? undefined,
          specialty: latest?.specialty ?? undefined,
        };
      });

    this.invitingSelected = true;
    this.candidateError = null;

    this.invitationsService.createBulk(this.assessmentId, rows).subscribe({
      next: (result) => {
        this.invitingSelected = false;
        this.candidateResult = result;
        this.selectedCandidateEmails.clear();
        this.invitationsPage = 1;
        this.loadInvitations(() => this.loadAvailableCandidates());
      },
      error: () => {
        this.invitingSelected = false;
        this.candidateError = 'No se pudo invitar a los candidatos seleccionados';
      },
    });
  }

  private loadAvailableCandidates(): void {
    this.loadingCandidates = true;

    this.reportsService.getCandidatesHistory({ pageSize: 100 }).subscribe({
      next: (result) => {
        // No repetir candidatos que ya tienen invitación a ESTE assessment.
        const alreadyInvited = new Set(
          this.invitations
            .map((inv) => (inv.candidateEmail ?? '').toLowerCase())
            .filter((email) => email.length > 0),
        );
        this.availableCandidateGroups = result.items.filter(
          (group) => !alreadyInvited.has(group.email.toLowerCase()),
        );
        this.loadingCandidates = false;
      },
      error: () => {
        this.candidateError = 'No se pudieron cargar los candidatos registrados';
        this.loadingCandidates = false;
      },
    });
  }

  private parseCsv(text: string): void {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      this.csvError = 'El archivo debe tener una fila de encabezado y al menos una fila de datos';
      this.csvRows = [];
      return;
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf('nombre');
    const emailIdx = header.indexOf('email');
    const trackIdx = header.indexOf('track');
    const specialtyIdx = header.indexOf('especialidad');

    if (nameIdx === -1 && emailIdx === -1) {
      this.csvError = 'El encabezado debe incluir al menos una columna "nombre" o "email"';
      this.csvRows = [];
      return;
    }

    this.csvError = null;
    this.csvResult = null;
    this.csvRows = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      const rawTrack = trackIdx >= 0 ? (cols[trackIdx]?.toUpperCase() as InvitationTrack) : undefined;
      return {
        candidateName: nameIdx >= 0 ? cols[nameIdx] || undefined : undefined,
        candidateEmail: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
        track: rawTrack && this.tracks.includes(rawTrack) ? rawTrack : undefined,
        specialty: specialtyIdx >= 0 ? cols[specialtyIdx] || undefined : undefined,
      };
    });
  }
}
