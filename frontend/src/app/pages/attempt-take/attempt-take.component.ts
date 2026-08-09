import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AttemptsService } from '../../core/attempts.service';
import { AttemptWithQuestions, RunResult, SanitizedQuestion } from '../../core/models';
import { DifficultyBadgeComponent } from '../../shared/difficulty-badge.component';
import { CodeEditorComponent } from '../../shared/code-editor.component';

// Wizard pregunta a pregunta. El código del candidato se guarda:
//  - al presionar "Ejecutar" (el endpoint /run también persiste submittedCode)
//  - al navegar (Anterior/Siguiente/Finalizar), por si no corrió el código
// así nunca se pierde lo escrito aunque no se haya ejecutado.
@Component({
  selector: 'app-attempt-take',
  standalone: true,
  imports: [CommonModule, FormsModule, DifficultyBadgeComponent, CodeEditorComponent],
  templateUrl: './attempt-take.component.html',
})
export class AttemptTakeComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attemptsService = inject(AttemptsService);

  attempt: AttemptWithQuestions | null = null;
  loading = false;
  error: string | null = null;

  currentIndex = 0;
  selectedOptionByQuestion: Record<string, string> = {};
  codeByQuestion: Record<string, string> = {};
  runResultByQuestion: Record<string, RunResult> = {};

  running = false;
  saving = false;
  finishing = false;

  // Cuenta regresiva visual; el corte real ya lo aplica el servidor (ver
  // AttemptsService.assertNotExpired en el backend) — esto es solo para que
  // el candidato vea cuánto le queda y se auto-envíe al llegar a cero.
  remainingSeconds: number | null = null;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private autoFinishTriggered = false;

  get currentQuestion(): SanitizedQuestion | null {
    return this.attempt?.questions[this.currentIndex] ?? null;
  }

  get isLastQuestion(): boolean {
    return !!this.attempt && this.currentIndex === this.attempt.questions.length - 1;
  }

  get currentRunResult(): RunResult | null {
    const q = this.currentQuestion;
    return q ? (this.runResultByQuestion[q.id] ?? null) : null;
  }

  get remainingTimeLabel(): string {
    if (this.remainingSeconds === null) return '';
    const clamped = Math.max(0, this.remainingSeconds);
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  get timeIsRunningOut(): boolean {
    return this.remainingSeconds !== null && this.remainingSeconds <= 60;
  }

  ngOnInit(): void {
    const attemptId = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;

    this.attemptsService.get(attemptId).subscribe({
      next: (attempt) => {
        if (attempt.status === 'COMPLETED') {
          this.router.navigate(['/attempt', attempt.id, 'result']);
          return;
        }
        this.attempt = attempt;
        for (const q of attempt.questions) {
          if (q.type === 'CODE') {
            this.codeByQuestion[q.id] = q.codeTemplate ?? '';
          }
        }
        this.loading = false;
        this.startTimerIfNeeded(attempt);
      },
      error: () => {
        this.error = 'No se pudo cargar el intento';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.timerHandle) clearInterval(this.timerHandle);
  }

  private startTimerIfNeeded(attempt: AttemptWithQuestions): void {
    if (!attempt.deadline) return;

    const deadlineMs = new Date(attempt.deadline).getTime();
    const tick = () => {
      this.remainingSeconds = Math.round((deadlineMs - Date.now()) / 1000);

      if (this.remainingSeconds <= 0 && !this.autoFinishTriggered) {
        this.autoFinishTriggered = true;
        if (this.timerHandle) clearInterval(this.timerHandle);
        this.finish();
      }
    };

    tick();
    this.timerHandle = setInterval(tick, 1000);
  }

  selectOption(questionId: string, optionId: string): void {
    const previousSelection = this.selectedOptionByQuestion[questionId];
    this.selectedOptionByQuestion[questionId] = optionId;
    this.error = null;

    this.attemptsService.submitAnswer(this.attempt!.id, questionId, { selectedOptionId: optionId }).subscribe({
      error: () => {
        // Revierte la selección optimista: si no se guardó, no debe verse marcada.
        if (previousSelection) {
          this.selectedOptionByQuestion[questionId] = previousSelection;
        } else {
          delete this.selectedOptionByQuestion[questionId];
        }
        this.error = 'No se pudo guardar tu respuesta, intenta de nuevo';
      },
    });
  }

  onCodeChange(questionId: string, code: string): void {
    this.codeByQuestion[questionId] = code;
  }

  runCode(): void {
    const question = this.currentQuestion;
    if (!question || !this.attempt) return;

    this.running = true;
    const code = this.codeByQuestion[question.id] ?? '';

    this.attemptsService.runCode(this.attempt.id, question.id, code).subscribe({
      next: (result) => {
        this.runResultByQuestion[question.id] = result;
        this.running = false;
      },
      error: () => {
        this.running = false;
        this.error = 'No se pudo ejecutar el código';
      },
    });
  }

  goNext(): void {
    this.persistCurrentCodeIfNeeded(() => {
      if (this.attempt && this.currentIndex < this.attempt.questions.length - 1) {
        this.currentIndex += 1;
      }
    });
  }

  goPrev(): void {
    this.persistCurrentCodeIfNeeded(() => {
      if (this.currentIndex > 0) {
        this.currentIndex -= 1;
      }
    });
  }

  finish(): void {
    if (!this.attempt) return;

    this.persistCurrentCodeIfNeeded(() => {
      this.finishing = true;
      this.attemptsService.finish(this.attempt!.id).subscribe({
        next: () => {
          this.finishing = false;
          this.router.navigate(['/attempt', this.attempt!.id, 'result']);
        },
        error: () => {
          this.finishing = false;
          this.error = 'No se pudo finalizar el intento';
        },
      });
    });
  }

  private persistCurrentCodeIfNeeded(after: () => void): void {
    const question = this.currentQuestion;

    if (!question || !this.attempt || question.type !== 'CODE') {
      after();
      return;
    }

    this.saving = true;
    const code = this.codeByQuestion[question.id] ?? '';

    this.attemptsService.submitAnswer(this.attempt.id, question.id, { code }).subscribe({
      next: () => {
        this.saving = false;
        after();
      },
      error: () => {
        this.saving = false;
        after();
      },
    });
  }
}
