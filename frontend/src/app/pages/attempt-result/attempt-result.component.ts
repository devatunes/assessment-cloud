import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AttemptsService } from '../../core/attempts.service';
import { AttemptResult } from '../../core/models';

@Component({
  selector: 'app-attempt-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attempt-result.component.html',
})
export class AttemptResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly attemptsService = inject(AttemptsService);

  result: AttemptResult | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    const attemptId = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;

    // El intento ya debería estar COMPLETED (attempt-take llama a /finish
    // antes de navegar aquí); si no, /finish es idempotente y lo completa.
    this.attemptsService.finish(attemptId).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el resultado';
        this.loading = false;
      },
    });
  }
}
