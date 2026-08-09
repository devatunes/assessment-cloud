import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../core/reports.service';
import { CandidateHistoryGroup, INVITATION_TRACK_LABELS, InvitationTrack } from '../../core/models';

// Historial de candidatos de la organización a través de TODOS los
// assessments oficiales y años (no de práctica: eso es privado del
// candidato, ver PracticeService.myAttempts en el backend). Se identifica
// al mismo candidato por correo entre convocatorias distintas.
@Component({
  selector: 'app-candidates-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidates-history.component.html',
})
export class CandidatesHistoryComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  readonly tracks = Object.keys(INVITATION_TRACK_LABELS) as InvitationTrack[];
  readonly trackLabels = INVITATION_TRACK_LABELS;

  groups: CandidateHistoryGroup[] = [];
  loading = false;
  error: string | null = null;

  filterTrack: InvitationTrack | '' = '';
  filterSpecialty = '';
  filterYear: number | null = null;

  get availableYears(): number[] {
    const years = new Set<number>();
    for (const group of this.groups) {
      for (const entry of group.entries) years.add(entry.year);
    }
    return [...years].sort((a, b) => b - a);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.reportsService
      .getCandidatesHistory({
        track: this.filterTrack || undefined,
        specialty: this.filterSpecialty || undefined,
        year: this.filterYear || undefined,
      })
      .subscribe({
        next: (groups) => {
          this.groups = groups;
          this.loading = false;
        },
        error: () => {
          this.error = 'No se pudo cargar el historial de candidatos';
          this.loading = false;
        },
      });
  }

  clearFilters(): void {
    this.filterTrack = '';
    this.filterSpecialty = '';
    this.filterYear = null;
    this.load();
  }
}
