import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionsService } from '../../core/questions.service';
import { AssessmentsService } from '../../core/assessments.service';
import { AssessmentVisibility, Question } from '../../core/models';
import { DifficultyBadgeComponent } from '../../shared/difficulty-badge.component';

@Component({
  selector: 'app-assessment-create',
  standalone: true,
  imports: [CommonModule, FormsModule, DifficultyBadgeComponent],
  templateUrl: './assessment-create.component.html',
})
export class AssessmentCreateComponent implements OnInit {
  private readonly questionsService = inject(QuestionsService);
  private readonly assessmentsService = inject(AssessmentsService);
  private readonly router = inject(Router);

  questions: Question[] = [];
  loading = false;
  saving = false;
  error: string | null = null;

  name = '';
  description = '';
  selectedIds: string[] = [];
  visibility: AssessmentVisibility = 'OFFICIAL';

  // Umbrales de nivel: se dejan como string en el form para permitir el
  // input vacío (número inválido en HTML no dispara ngModel limpiamente);
  // se parsean a number recién al enviar.
  levelJunior = '';
  levelSemisenior = '';
  levelSenior = '';

  ngOnInit(): void {
    this.loading = true;
    this.questionsService.list({}).subscribe({
      next: (questions) => {
        this.questions = questions;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las preguntas';
        this.loading = false;
      },
    });
  }

  toggleSelected(questionId: string): void {
    const index = this.selectedIds.indexOf(questionId);
    if (index === -1) {
      this.selectedIds.push(questionId);
    } else {
      this.selectedIds.splice(index, 1);
    }
  }

  isSelected(questionId: string): boolean {
    return this.selectedIds.includes(questionId);
  }

  submit(): void {
    this.error = null;

    if (!this.name.trim()) {
      this.error = 'El assessment necesita un nombre';
      return;
    }
    if (this.selectedIds.length === 0) {
      this.error = 'Selecciona al menos una pregunta';
      return;
    }

    const levelThresholds: { junior?: number; semisenior?: number; senior?: number } = {};
    if (this.levelJunior) levelThresholds.junior = Number(this.levelJunior);
    if (this.levelSemisenior) levelThresholds.semisenior = Number(this.levelSemisenior);
    if (this.levelSenior) levelThresholds.senior = Number(this.levelSenior);
    const hasLevels = Object.keys(levelThresholds).length > 0;

    this.saving = true;
    this.assessmentsService
      .create({
        name: this.name,
        description: this.description || undefined,
        questionIds: this.selectedIds,
        visibility: this.visibility,
        levelThresholds: hasLevels ? levelThresholds : undefined,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.router.navigateByUrl('/assessments');
        },
        error: () => {
          this.saving = false;
          this.error = 'No se pudo crear el assessment';
        },
      });
  }
}
