import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PracticeService } from '../../core/practice.service';
import { CandidateAuthService } from '../../core/candidate-auth.service';
import { OnboardingTourService } from '../../core/onboarding-tour.service';
import { PracticeCatalogEntry } from '../../core/models';
import { PaginatorComponent } from '../../shared/paginator.component';

@Component({
  selector: 'app-practice-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginatorComponent],
  templateUrl: './practice-catalog.component.html',
})
export class PracticeCatalogComponent implements OnInit {
  private readonly practiceService = inject(PracticeService);
  private readonly router = inject(Router);
  protected readonly candidateAuthService = inject(CandidateAuthService);
  private readonly onboardingTourService = inject(OnboardingTourService);

  readonly pageSize = 20;

  catalog: PracticeCatalogEntry[] = [];
  loading = false;
  error: string | null = null;
  startingId: string | null = null;
  page = 1;
  total = 0;

  ngOnInit(): void {
    this.onboardingTourService.startCandidateTourIfNeeded();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.practiceService.listCatalog({ page: this.page, pageSize: this.pageSize }).subscribe({
      next: (result) => {
        this.catalog = result.items;
        this.total = result.total;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el catálogo de simulacros';
        this.loading = false;
      },
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.load();
  }

  start(entry: PracticeCatalogEntry): void {
    this.startingId = entry.id;
    this.error = null;

    this.practiceService.start(entry.id).subscribe({
      next: (attempt) => {
        this.router.navigate(['/attempt', attempt.id]);
      },
      error: () => {
        this.startingId = null;
        this.error = 'No se pudo iniciar el simulacro';
      },
    });
  }
}
