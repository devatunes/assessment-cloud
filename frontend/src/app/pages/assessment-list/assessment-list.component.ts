import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssessmentsService } from '../../core/assessments.service';
import { Assessment } from '../../core/models';

@Component({
  selector: 'app-assessment-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './assessment-list.component.html',
})
export class AssessmentListComponent implements OnInit {
  private readonly assessmentsService = inject(AssessmentsService);

  assessments: Assessment[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loading = true;
    this.assessmentsService.list().subscribe({
      next: (assessments) => {
        this.assessments = assessments;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los assessments';
        this.loading = false;
      },
    });
  }
}
