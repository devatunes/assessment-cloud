import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestionsService } from '../../core/questions.service';
import { AuthService } from '../../core/auth.service';
import { OnboardingTourService } from '../../core/onboarding-tour.service';
import {
  CreateQuestionPayload,
  QUESTION_CATEGORY_LABELS,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
} from '../../core/models';
import { DifficultyBadgeComponent } from '../../shared/difficulty-badge.component';
import { QuestionFormComponent } from '../../shared/question-form.component';

@Component({
  selector: 'app-question-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DifficultyBadgeComponent, QuestionFormComponent],
  templateUrl: './question-library.component.html',
})
export class QuestionLibraryComponent implements OnInit {
  private readonly questionsService = inject(QuestionsService);
  private readonly authService = inject(AuthService);
  private readonly onboardingTourService = inject(OnboardingTourService);

  readonly categories = Object.keys(QUESTION_CATEGORY_LABELS) as QuestionCategory[];
  readonly categoryLabels = QUESTION_CATEGORY_LABELS;

  questions: Question[] = [];
  loading = false;
  error: string | null = null;
  duplicatingId: string | null = null;

  filterCategory: QuestionCategory | '' = '';
  filterDifficulty: QuestionDifficulty | '' = '';
  filterType: QuestionType | '' = '';

  showCreateForm = false;
  creating = false;
  createError: string | null = null;

  ngOnInit(): void {
    this.load();
    this.onboardingTourService.startOrgTourIfNeeded();
  }

  isOwn(question: Question): boolean {
    return question.organizationId === this.authService.currentUser()?.organizationId;
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.questionsService
      .list({
        category: this.filterCategory || undefined,
        difficulty: this.filterDifficulty || undefined,
        type: this.filterType || undefined,
      })
      .subscribe({
        next: (questions) => {
          this.questions = questions;
          this.loading = false;
        },
        error: () => {
          this.error = 'No se pudieron cargar las preguntas. ¿Está el backend corriendo?';
          this.loading = false;
        },
      });
  }

  clearFilters(): void {
    this.filterCategory = '';
    this.filterDifficulty = '';
    this.filterType = '';
    this.load();
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.createError = null;
  }

  duplicate(question: Question): void {
    this.duplicatingId = question.id;
    this.questionsService.duplicate(question.id).subscribe({
      next: () => {
        this.duplicatingId = null;
        this.load();
      },
      error: () => {
        this.duplicatingId = null;
        this.error = 'No se pudo copiar la pregunta';
      },
    });
  }

  createQuestion(payload: CreateQuestionPayload): void {
    this.creating = true;
    this.createError = null;

    this.questionsService.create(payload).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.load();
      },
      error: () => {
        this.creating = false;
        this.createError = 'No se pudo crear la pregunta';
      },
    });
  }
}
