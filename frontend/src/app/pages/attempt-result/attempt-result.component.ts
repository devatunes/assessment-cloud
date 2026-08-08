import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly router = inject(Router);
  private readonly attemptsService = inject(AttemptsService);

  result: AttemptResult | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    const attemptId = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;

    // Lectura pura: NO finaliza el intento (a diferencia de /finish). Si
    // alguien llega aquí con un intento aún IN_PROGRESS (URL editada a mano,
    // atrás/adelante del navegador), el backend responde 400 y lo mandamos
    // de vuelta a resolverlo en vez de darlo por terminado.
    this.attemptsService.getResult(attemptId).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
      },
      error: (err) => {
        if (err?.status === 400) {
          this.router.navigate(['/attempt', attemptId]);
          return;
        }
        this.error = 'No se pudo cargar el resultado';
        this.loading = false;
      },
    });
  }
}
