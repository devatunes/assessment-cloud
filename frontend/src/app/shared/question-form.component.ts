import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ContentVisibility,
  CreateQuestionPayload,
  QUESTION_CATEGORY_LABELS,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
} from '../core/models';

// El input de un test case se captura como texto en formato JSON (ej. `[1,2,3]`,
// `"hola"`, `5`) porque QuestionTestCase.input admite cualquier valor: se
// parsea recién al enviar el formulario (ver parseando en submit()).
type TestCaseFormRow = {
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

type QuestionFormShape = {
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
};

const DEFAULT_CODE_TEMPLATE = 'function solution(input) {\n  // tu código aquí\n}\n';

// Formulario de crear/editar pregunta, extraído de question-library para
// reusarlo tal cual en question-detail (editar). `initial` ausente = modo
// crear (formulario vacío); presente = modo editar (pre-rellenado). El
// componente valida y arma el payload, pero NUNCA llama al backend — eso
// queda a cargo del padre vía (save), que sabe si es un POST o un PUT.
@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question-form.component.html',
})
export class QuestionFormComponent implements OnChanges {
  @Input() initial: Question | null = null;
  @Input() submitLabel = 'Guardar pregunta';
  @Input() savingLabel = 'Guardando...';
  @Input() saving = false;
  @Input() serverError: string | null = null;
  @Input() showCancel = false;

  @Output() save = new EventEmitter<CreateQuestionPayload>();
  @Output() cancelled = new EventEmitter<void>();

  readonly categories = Object.keys(QUESTION_CATEGORY_LABELS) as QuestionCategory[];
  readonly categoryLabels = QUESTION_CATEGORY_LABELS;

  formError: string | null = null;
  form: QuestionFormShape = this.emptyForm();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initial']) {
      this.form = this.initial ? this.formFromQuestion(this.initial) : this.emptyForm();
      this.formError = null;
    }
  }

  addOption(): void {
    this.form.options.push({ text: '', isCorrect: false });
  }

  removeOption(index: number): void {
    this.form.options.splice(index, 1);
  }

  addTestCase(): void {
    this.form.testCases.push({ input: '', expectedOutput: '', hidden: false });
  }

  removeTestCase(index: number): void {
    this.form.testCases.splice(index, 1);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    this.formError = null;

    const payload: CreateQuestionPayload = {
      title: this.form.title,
      statement: this.form.statement,
      category: this.form.category,
      difficulty: this.form.difficulty,
      type: this.form.type,
      explanation: this.form.explanation || undefined,
      visibility: this.form.visibility,
    };

    if (this.form.type === 'MULTIPLE_CHOICE') {
      const validOptions = this.form.options.filter((o) => o.text.trim());
      if (validOptions.length < 2 || !validOptions.some((o) => o.isCorrect)) {
        this.formError = 'Agrega al menos 2 opciones y marca la respuesta correcta';
        return;
      }
      payload.options = validOptions;
    } else {
      if (!this.form.codeTemplate.trim()) {
        this.formError = 'Agrega un template de código inicial';
        return;
      }

      const parsedTestCases: { input: unknown; expectedOutput: string; hidden: boolean }[] = [];
      for (let i = 0; i < this.form.testCases.length; i++) {
        const row = this.form.testCases[i];
        if (!row.input.trim() && !row.expectedOutput.trim()) {
          continue; // fila vacía, se ignora
        }
        if (!row.expectedOutput.trim()) {
          this.formError = `El caso ${i + 1} necesita un output esperado`;
          return;
        }
        try {
          const input = row.input.trim() ? JSON.parse(row.input) : null;
          parsedTestCases.push({ input, expectedOutput: row.expectedOutput, hidden: row.hidden });
        } catch {
          this.formError = `El input del caso ${i + 1} debe ser JSON válido (ej: [1,2,3], "texto", 5)`;
          return;
        }
      }

      if (parsedTestCases.length === 0) {
        this.formError = 'Agrega al menos un test case con su output esperado';
        return;
      }

      payload.codeTemplate = this.form.codeTemplate;
      payload.testCases = parsedTestCases;
    }

    this.save.emit(payload);
  }

  private formFromQuestion(question: Question): QuestionFormShape {
    return {
      title: question.title,
      statement: question.statement,
      category: question.category,
      difficulty: question.difficulty,
      type: question.type,
      codeTemplate: question.codeTemplate ?? DEFAULT_CODE_TEMPLATE,
      explanation: question.explanation ?? '',
      visibility: question.visibility,
      options: question.options.length
        ? question.options.map((o) => ({ text: o.text, isCorrect: !!o.isCorrect }))
        : [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
          ],
      testCases: question.testCases?.length
        ? question.testCases.map((tc) => ({
            input: JSON.stringify(tc.input),
            expectedOutput: tc.expectedOutput,
            hidden: tc.hidden,
          }))
        : [
            { input: '', expectedOutput: '', hidden: false },
            { input: '', expectedOutput: '', hidden: true },
          ],
    };
  }

  private emptyForm(): QuestionFormShape {
    return {
      title: '',
      statement: '',
      category: 'BACKEND',
      difficulty: 'EASY',
      type: 'MULTIPLE_CHOICE',
      codeTemplate: DEFAULT_CODE_TEMPLATE,
      explanation: '',
      visibility: 'PRIVATE',
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
