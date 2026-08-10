import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuestionBanksService } from '../../core/question-banks.service';
import { QuestionsService } from '../../core/questions.service';
import { AuthService } from '../../core/auth.service';
import {
  ContentVisibility,
  QUESTION_CATEGORY_LABELS,
  Question,
  QuestionBankDetail,
} from '../../core/models';

@Component({
  selector: 'app-question-bank-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './question-bank-detail.component.html',
})
export class QuestionBankDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly banksService = inject(QuestionBanksService);
  private readonly questionsService = inject(QuestionsService);
  private readonly authService = inject(AuthService);

  readonly categoryLabels = QUESTION_CATEGORY_LABELS;

  bankId = '';
  bank: QuestionBankDetail | null = null;
  loading = false;
  error: string | null = null;

  removingQuestionId: string | null = null;

  showEditForm = false;
  savingEdit = false;
  editError: string | null = null;
  editForm: { name: string; description: string; visibility: ContentVisibility } = {
    name: '',
    description: '',
    visibility: 'PRIVATE',
  };

  showAddPicker = false;
  availableQuestions: Question[] = [];
  loadingAvailable = false;
  selectedToAdd = new Set<string>();
  adding = false;
  addError: string | null = null;

  get isOwn(): boolean {
    return this.bank?.organizationId === this.authService.currentUser()?.organizationId;
  }

  ngOnInit(): void {
    this.bankId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.banksService.get(this.bankId).subscribe({
      next: (bank) => {
        this.bank = bank;
        this.loading = false;
      },
      error: (err) => {
        if (err?.status === 404) {
          this.router.navigate(['/question-banks']);
          return;
        }
        this.error = 'No se pudo cargar el banco';
        this.loading = false;
      },
    });
  }

  toggleEditForm(): void {
    this.showEditForm = !this.showEditForm;
    this.editError = null;
    if (this.showEditForm && this.bank) {
      this.editForm = {
        name: this.bank.name,
        description: this.bank.description ?? '',
        visibility: this.bank.visibility,
      };
    }
  }

  saveEdit(): void {
    if (!this.editForm.name.trim()) {
      this.editError = 'El nombre es obligatorio';
      return;
    }

    this.savingEdit = true;
    this.editError = null;

    this.banksService
      .update(this.bankId, {
        name: this.editForm.name,
        description: this.editForm.description || undefined,
        visibility: this.editForm.visibility,
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
    this.removingQuestionId = questionId;
    this.banksService.removeQuestion(this.bankId, questionId).subscribe({
      next: () => {
        this.removingQuestionId = null;
        this.load();
      },
      error: () => {
        this.removingQuestionId = null;
        this.error = 'No se pudo quitar la pregunta del banco';
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
        const currentIds = new Set(this.bank?.items.map((i) => i.questionId) ?? []);
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
    if (this.selectedToAdd.size === 0) {
      return;
    }

    this.adding = true;
    this.addError = null;

    this.banksService.addQuestions(this.bankId, Array.from(this.selectedToAdd)).subscribe({
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
}
