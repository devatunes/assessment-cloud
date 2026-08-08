import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentsService } from '../../core/assessments.service';
import { AttemptsService } from '../../core/attempts.service';
import { Assessment } from '../../core/models';

@Component({
  selector: 'app-attempt-start',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attempt-start.component.html',
})
export class AttemptStartComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assessmentsService = inject(AssessmentsService);
  private readonly attemptsService = inject(AttemptsService);

  assessment: Assessment | null = null;
  loading = false;
  starting = false;
  error: string | null = null;

  candidateName = '';
  candidateEmail = '';

  ngOnInit(): void {
    const assessmentId = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;

    this.assessmentsService.get(assessmentId).subscribe({
      next: (assessment) => {
        this.assessment = assessment;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se encontró el assessment';
        this.loading = false;
      },
    });
  }

  start(): void {
    if (!this.assessment) return;
    if (!this.candidateName.trim()) {
      this.error = 'Ingresa tu nombre para comenzar';
      return;
    }

    this.error = null;
    this.starting = true;

    this.attemptsService
      .start({
        assessmentId: this.assessment.id,
        candidateName: this.candidateName,
      })
      .subscribe({
        next: (attempt) => {
          this.starting = false;
          this.router.navigate(['/attempt', attempt.id]);
        },
        error: () => {
          this.starting = false;
          this.error = 'No se pudo iniciar el intento';
        },
      });
  }
}
