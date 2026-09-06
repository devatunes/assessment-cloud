import { Component, Input } from '@angular/core';
import { QuestionDifficulty, QuestionType } from '../core/models';

@Component({
  selector: 'app-difficulty-badge',
  standalone: true,
  template: `
    <span class="badge" [class]="'badge-' + difficulty.toLowerCase()">{{ difficulty }}</span>
    @if (type) {
      <span class="badge" [class]="type === 'CODE' ? 'badge-code' : 'badge-mc'">
        {{ type === 'CODE' ? 'Código' : 'Opción múltiple' }}
      </span>
    }
  `,
})
export class DifficultyBadgeComponent {
  @Input({ required: true }) difficulty!: QuestionDifficulty;
  @Input() type?: QuestionType;
}
