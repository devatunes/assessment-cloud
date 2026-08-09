import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AttemptsService } from '../../core/attempts.service';
import { AttemptResult, Badge } from '../../core/models';

@Component({
  selector: 'app-attempt-result',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attempt-result.component.html',
})
export class AttemptResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attemptsService = inject(AttemptsService);

  result: AttemptResult | null = null;
  loading = false;
  error: string | null = null;
  attemptId = '';

  // Insignias otorgadas justo al finalizar (viajan por router state desde
  // attempt-take, ver AttemptTakeComponent.finish) — se muestran una sola
  // vez, no persisten si se recarga la página.
  newBadges: Badge[] = history.state?.newBadges ?? [];

  feedbackRating: number | null = null;
  feedbackComment = '';
  feedbackSubmitted = false;
  submittingFeedback = false;
  feedbackError: string | null = null;

  ngOnInit(): void {
    const attemptId = this.route.snapshot.paramMap.get('id')!;
    this.attemptId = attemptId;
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

  submitFeedback(): void {
    if (!this.feedbackRating) {
      return;
    }
    this.submittingFeedback = true;
    this.feedbackError = null;

    this.attemptsService
      .submitFeedback(this.attemptId, {
        rating: this.feedbackRating,
        comment: this.feedbackComment.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.feedbackSubmitted = true;
          this.submittingFeedback = false;
        },
        error: () => {
          this.feedbackError = 'No se pudo enviar la encuesta, intenta de nuevo';
          this.submittingFeedback = false;
        },
      });
  }
}
