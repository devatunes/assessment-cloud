import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssessmentsService } from '../../core/assessments.service';
import { Assessment } from '../../core/models';
import { PaginatorComponent } from '../../shared/paginator.component';

@Component({
  selector: 'app-assessment-list',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginatorComponent],
  templateUrl: './assessment-list.component.html',
})
export class AssessmentListComponent implements OnInit {
  private readonly assessmentsService = inject(AssessmentsService);

  readonly pageSize = 20;

  assessments: Assessment[] = [];
  loading = false;
  error: string | null = null;
  page = 1;
  total = 0;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.assessmentsService.list({ page: this.page, pageSize: this.pageSize }).subscribe({
      next: (result) => {
        this.assessments = result.items;
        this.total = result.total;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los assessments';
        this.loading = false;
      },
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.load();
  }
}
