import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentsService } from '../../core/assessments.service';
import { QuestionsService } from '../../core/questions.service';
import { Assessment, AssessmentVisibility, QUESTION_CATEGORY_LABELS, Question } from '../../core/models';
import { DifficultyBadgeComponent } from '../../shared/difficulty-badge.component';

@Component({
  selector: 'app-assessment-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DifficultyBadgeComponent],
  templateUrl: './assessment-detail.component.html',
})
export class AssessmentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assessmentsService = inject(AssessmentsService);
  private readonly questionsService = inject(QuestionsService);

  readonly categoryLabels = QUESTION_CATEGORY_LABELS;

  assessmentId = '';
  assessment: Assessment | null = null;
  loading = false;
  error: string | null = null;

  removingQuestionId: string | null = null;

  showEditForm = false;
  savingEdit = false;
  editError: string | null = null;
  editForm: {
    name: string;
    description: string;
    visibility: AssessmentVisibility;
    levelJunior: string;
    levelSemisenior: string;
    levelSenior: string;
    timeLimitMinutes: string;
  } = this.emptyEditForm();

  showAddPicker = false;
  availableQuestions: Question[] = [];
  loadingAvailable = false;
  selectedToAdd = new Set<string>();
  adding = false;
  addError: string | null = null;

  ngOnInit(): void {
    this.assessmentId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.assessmentsService.get(this.assessmentId).subscribe({
      next: (assessment) => {
        this.assessment = assessment;
        this.loading = false;
      },
      error: (err) => {
        if (err?.status === 404) {
          this.router.navigate(['/assessments']);
          return;
        }
        this.error = 'No se pudo cargar el assessment';
        this.loading = false;
      },
    });
  }

  toggleEditForm(): void {
    this.showEditForm = !this.showEditForm;
    this.editError = null;
    if (this.showEditForm && this.assessment) {
      this.editForm = {
        name: this.assessment.name,
        description: this.assessment.description ?? '',
        visibility: this.assessment.visibility,
        levelJunior: this.assessment.levelThresholds?.junior?.toString() ?? '',
        levelSemisenior: this.assessment.levelThresholds?.semisenior?.toString() ?? '',
        levelSenior: this.assessment.levelThresholds?.senior?.toString() ?? '',
        timeLimitMinutes: this.assessment.timeLimitMinutes?.toString() ?? '',
      };
    }
  }

  saveEdit(): void {
    if (!this.editForm.name.trim()) {
      this.editError = 'El nombre es obligatorio';
      return;
    }

    const levelThresholds: { junior?: number; semisenior?: number; senior?: number } = {};
    if (this.editForm.levelJunior) levelThresholds.junior = Number(this.editForm.levelJunior);
    if (this.editForm.levelSemisenior) levelThresholds.semisenior = Number(this.editForm.levelSemisenior);
    if (this.editForm.levelSenior) levelThresholds.senior = Number(this.editForm.levelSenior);

    this.savingEdit = true;
    this.editError = null;

    this.assessmentsService
      .update(this.assessmentId, {
        name: this.editForm.name,
        description: this.editForm.description || undefined,
        visibility: this.editForm.visibility,
        levelThresholds,
        timeLimitMinutes: this.editForm.timeLimitMinutes ? Number(this.editForm.timeLimitMinutes) : undefined,
      })
      .subscribe({
        next: () => {
          this.savingEdit = false;
          this.showEditForm = false;
          this.load();
        },
        error: () => {
          this.savingEdit = false;
          this.editError = 'No se pudo guardar los cambios';
        },
      });
  }

  removeQuestion(questionId: string): void {
    if (!this.assessment?.questions) return;
    const remainingIds = this.assessment.questions
      .filter((q) => q.questionId !== questionId)
      .map((q) => q.questionId);

    if (remainingIds.length === 0) {
      this.error = 'Un assessment necesita al menos una pregunta — agrega otra antes de quitar esta.';
      return;
    }

    this.removingQuestionId = questionId;
    this.assessmentsService.update(this.assessmentId, { questionIds: remainingIds }).subscribe({
      next: () => {
        this.removingQuestionId = null;
        this.load();
      },
      error: () => {
        this.removingQuestionId = null;
        this.error = 'No se pudo quitar la pregunta';
      },
    });
  }

  toggleAddPicker(): void {
    this.showAddPicker = !this.showAddPicker;
    this.addError = null;
    this.selectedToAdd.clear();

    if (this.showAddPicker) {
      this.loadAvailableQuestions();
    }
  }

  private loadAvailableQuestions(): void {
    this.loadingAvailable = true;
    this.questionsService.list({ pageSize: 100 }).subscribe({
      next: (result) => {
        const currentIds = new Set(this.assessment?.questions?.map((q) => q.questionId) ?? []);
        this.availableQuestions = result.items.filter((q) => !currentIds.has(q.id));
        this.loadingAvailable = false;
      },
      error: () => {
        this.addError = 'No se pudieron cargar las preguntas disponibles';
        this.loadingAvailable = false;
      },
    });
  }

  toggleSelected(questionId: string): void {
    if (this.selectedToAdd.has(questionId)) {
      this.selectedToAdd.delete(questionId);
    } else {
      this.selectedToAdd.add(questionId);
    }
  }

  confirmAdd(): void {
    if (this.selectedToAdd.size === 0 || !this.assessment?.questions) return;

    const questionIds = [
      ...this.assessment.questions.map((q) => q.questionId),
      ...Array.from(this.selectedToAdd),
    ];

    this.adding = true;
    this.addError = null;

    this.assessmentsService.update(this.assessmentId, { questionIds }).subscribe({
      next: () => {
        this.adding = false;
        this.showAddPicker = false;
        this.selectedToAdd.clear();
        this.load();
      },
      error: () => {
        this.adding = false;
        this.addError = 'No se pudieron agregar las preguntas seleccionadas';
      },
    });
  }

  private emptyEditForm() {
    return {
      name: '',
      description: '',
      visibility: 'OFFICIAL' as AssessmentVisibility,
      levelJunior: '',
      levelSemisenior: '',
      levelSenior: '',
      timeLimitMinutes: '',
    };
  }
}
