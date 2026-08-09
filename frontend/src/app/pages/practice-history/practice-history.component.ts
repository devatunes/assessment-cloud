import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PracticeService } from '../../core/practice.service';
import { PracticeAttemptSummary } from '../../core/models';

@Component({
  selector: 'app-practice-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './practice-history.component.html',
})
export class PracticeHistoryComponent implements OnInit {
  private readonly practiceService = inject(PracticeService);

  attempts: PracticeAttemptSummary[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loading = true;
    this.practiceService.myAttempts().subscribe({
      next: (attempts) => {
        this.attempts = attempts;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar tu historial';
        this.loading = false;
      },
    });
  }
}
