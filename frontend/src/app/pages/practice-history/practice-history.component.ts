import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PracticeService } from '../../core/practice.service';
import { EarnedBadge, PracticeAttemptSummary } from '../../core/models';
import { PaginatorComponent } from '../../shared/paginator.component';

@Component({
  selector: 'app-practice-history',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginatorComponent],
  templateUrl: './practice-history.component.html',
})
export class PracticeHistoryComponent implements OnInit {
  private readonly practiceService = inject(PracticeService);

  readonly pageSize = 20;

  attempts: PracticeAttemptSummary[] = [];
  loading = false;
  error: string | null = null;
  page = 1;
  total = 0;

  badges: EarnedBadge[] = [];
  loadingBadges = false;

  ngOnInit(): void {
    this.load();

    this.loadingBadges = true;
    this.practiceService.myBadges().subscribe({
      next: (badges) => {
        this.badges = badges;
        this.loadingBadges = false;
      },
      error: () => {
        this.loadingBadges = false;
      },
    });
  }

  load(): void {
    this.loading = true;
    this.practiceService.myAttempts({ page: this.page, pageSize: this.pageSize }).subscribe({
      next: (result) => {
        this.attempts = result.items;
        this.total = result.total;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar tu historial';
        this.loading = false;
      },
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.load();
  }
}
