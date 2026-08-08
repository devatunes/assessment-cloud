import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuestionsService } from '../../core/questions.service';
import { CreateQuestionPayload, Question, QuestionDifficulty, QuestionType } from '../../core/models';
import { DifficultyBadgeComponent } from '../../shared/difficulty-badge.component';

@Component({
  selector: 'app-question-library',
  standalone: true,
  imports: [CommonModule, FormsModule, DifficultyBadgeComponent],
  templateUrl: './question-library.component.html',
})
export class QuestionLibraryComponent implements OnInit {
  private readonly questionsService = inject(QuestionsService);

  questions: Question[] = [];
  loading = false;
  error: string | null = null;

  filterCategory = '';
  filterDifficulty: QuestionDifficulty | '' = '';
  filterType: QuestionType | '' = '';

  showCreateForm = false;
  creating = false;
  createError: string | null = null;

  newQuestion: {
    title: string;
    statement: string;
    category: string;
    difficulty: QuestionDifficulty;
    type: QuestionType;
    codeTemplate: string;
    options: { text: string; isCorrect: boolean }[];
  } = this.emptyForm();

  ngOnInit(): void {
    this.load();
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

  submitNewQuestion(): void {
    this.createError = null;

    const payload: CreateQuestionPayload = {
      title: this.newQuestion.title,
      statement: this.newQuestion.statement,
      category: this.newQuestion.category,
      difficulty: this.newQuestion.difficulty,
      type: this.newQuestion.type,
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
      payload.codeTemplate = this.newQuestion.codeTemplate;
      payload.testCases = [{ input: null, expectedOutput: '', hidden: false }];
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
      category: '',
      difficulty: 'EASY' as QuestionDifficulty,
      type: 'MULTIPLE_CHOICE' as QuestionType,
      codeTemplate: 'function solution(input) {\n  // tu código aquí\n}\n',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
    };
  }
}
