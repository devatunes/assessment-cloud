import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuestionsService } from '../../core/questions.service';
import { AuthService } from '../../core/auth.service';
import {
  ContentVisibility,
  CreateQuestionPayload,
  QUESTION_CATEGORY_LABELS,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
} from '../../core/models';
import { DifficultyBadgeComponent } from '../../shared/difficulty-badge.component';

// El input de un test case se captura como texto en formato JSON (ej. `[1,2,3]`,
// `"hola"`, `5`) porque QuestionTestCase.input admite cualquier valor: se
// parsea recién al enviar el formulario (ver parseTestCaseInput).
type TestCaseFormRow = {
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

@Component({
  selector: 'app-question-library',
  standalone: true,
  imports: [CommonModule, FormsModule, DifficultyBadgeComponent],
  templateUrl: './question-library.component.html',
})
export class QuestionLibraryComponent implements OnInit {
  private readonly questionsService = inject(QuestionsService);
  private readonly authService = inject(AuthService);

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

  newQuestion: {
    title: string;
    statement: string;
    category: QuestionCategory;
    difficulty: QuestionDifficulty;
    type: QuestionType;
    codeTemplate: string;
    explanation: string;
    visibility: ContentVisibility;
    options: { text: string; isCorrect: boolean }[];
    testCases: TestCaseFormRow[];
  } = this.emptyForm();

  ngOnInit(): void {
    this.load();
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

  addOption(): void {
    this.newQuestion.options.push({ text: '', isCorrect: false });
  }

  removeOption(index: number): void {
    this.newQuestion.options.splice(index, 1);
  }

  addTestCase(): void {
    this.newQuestion.testCases.push({ input: '', expectedOutput: '', hidden: false });
  }

  removeTestCase(index: number): void {
    this.newQuestion.testCases.splice(index, 1);
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

  submitNewQuestion(): void {
    this.createError = null;

    const payload: CreateQuestionPayload = {
      title: this.newQuestion.title,
      statement: this.newQuestion.statement,
      category: this.newQuestion.category,
      difficulty: this.newQuestion.difficulty,
      type: this.newQuestion.type,
      explanation: this.newQuestion.explanation || undefined,
      visibility: this.newQuestion.visibility,
    };

    if (this.newQuestion.type === 'MULTIPLE_CHOICE') {
      const validOptions = this.newQuestion.options.filter((o) => o.text.trim());
      if (validOptions.length < 2 || !validOptions.some((o) => o.isCorrect)) {
        this.createError = 'Agrega al menos 2 opciones y marca la respuesta correcta';
        return;
      }
      payload.options = validOptions;
    } else {
      if (!this.newQuestion.codeTemplate.trim()) {
        this.createError = 'Agrega un template de código inicial';
        return;
      }

      const parsedTestCases: { input: unknown; expectedOutput: string; hidden: boolean }[] = [];
      for (let i = 0; i < this.newQuestion.testCases.length; i++) {
        const row = this.newQuestion.testCases[i];
        if (!row.input.trim() && !row.expectedOutput.trim()) {
          continue; // fila vacía, se ignora
        }
        if (!row.expectedOutput.trim()) {
          this.createError = `El caso ${i + 1} necesita un output esperado`;
          return;
        }
        try {
          const input = row.input.trim() ? JSON.parse(row.input) : null;
          parsedTestCases.push({ input, expectedOutput: row.expectedOutput, hidden: row.hidden });
        } catch {
          this.createError = `El input del caso ${i + 1} debe ser JSON válido (ej: [1,2,3], "texto", 5)`;
          return;
        }
      }

      if (parsedTestCases.length === 0) {
        this.createError = 'Agrega al menos un test case con su output esperado';
        return;
      }

      payload.codeTemplate = this.newQuestion.codeTemplate;
      payload.testCases = parsedTestCases;
    }

    this.creating = true;
    this.questionsService.create(payload).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.newQuestion = this.emptyForm();
        this.load();
      },
      error: () => {
        this.creating = false;
        this.createError = 'No se pudo crear la pregunta';
      },
    });
  }

  private emptyForm() {
    return {
      title: '',
      statement: '',
      category: 'BACKEND' as QuestionCategory,
      difficulty: 'EASY' as QuestionDifficulty,
      type: 'MULTIPLE_CHOICE' as QuestionType,
      codeTemplate: 'function solution(input) {\n  // tu código aquí\n}\n',
      explanation: '',
      visibility: 'PRIVATE' as ContentVisibility,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
      testCases: [
        { input: '', expectedOutput: '', hidden: false },
        { input: '', expectedOutput: '', hidden: true },
      ],
    };
  }
}
