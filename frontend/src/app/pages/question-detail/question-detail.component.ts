import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { QuestionsService } from '../../core/questions.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { CreateQuestionPayload, QUESTION_CATEGORY_LABELS, Question } from '../../core/models';
import { DifficultyBadgeComponent } from '../../shared/difficulty-badge.component';
import { QuestionFormComponent } from '../../shared/question-form.component';

@Component({
  selector: 'app-question-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DifficultyBadgeComponent, QuestionFormComponent],
  templateUrl: './question-detail.component.html',
})
export class QuestionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questionsService = inject(QuestionsService);
  private readonly authService = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly categoryLabels = QUESTION_CATEGORY_LABELS;

  questionId = '';
  question: Question | null = null;
  loading = false;
  error: string | null = null;

  editing = false;
  saving = false;
  saveError: string | null = null;

  duplicating = false;
  removing = false;

  get isOwn(): boolean {
    return this.question?.organizationId === this.authService.currentUser()?.organizationId;
  }

  ngOnInit(): void {
    this.questionId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.questionsService.get(this.questionId).subscribe({
      next: (question) => {
        this.question = question;
        this.loading = false;
      },
      error: (err) => {
        if (err?.status === 404) {
          this.router.navigate(['/questions']);
          return;
        }
        this.error = 'No se pudo cargar la pregunta';
        this.loading = false;
      },
    });
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    this.saveError = null;
  }

  saveEdit(payload: CreateQuestionPayload): void {
    this.saving = true;
    this.saveError = null;

    this.questionsService.update(this.questionId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.editing = false;
        this.load();
      },
      error: () => {
        this.saving = false;
        this.saveError = 'No se pudo guardar los cambios';
      },
    });
  }

  duplicate(): void {
    if (!this.question) return;
    this.duplicating = true;
    this.questionsService.duplicate(this.question.id).subscribe({
      next: (copy) => {
        this.duplicating = false;
        this.router.navigate(['/questions', copy.id]);
      },
      error: () => {
        this.duplicating = false;
        this.error = 'No se pudo copiar la pregunta';
      },
    });
  }

  async remove(): Promise<void> {
    if (!this.question) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar pregunta',
      message: `¿Eliminar "${this.question.title}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      isDangerous: true,
    });
    if (!confirmed) return;

    this.removing = true;
    this.questionsService.remove(this.question.id).subscribe({
      next: () => {
        this.router.navigate(['/questions']);
      },
      error: () => {
        this.removing = false;
        this.error = 'No se pudo eliminar la pregunta';
      },
    });
  }
}
