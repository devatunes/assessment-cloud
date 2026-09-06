import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ConfirmDialogService } from '../core/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialogService.options(); as opts) {
      <div class="onboarding-overlay" (click)="cancel()">
        <article
          class="confirm-modal"
          [class.confirm-modal-dangerous]="opts.isDangerous"
          (click)="$event.stopPropagation()"
        >
          <h3>{{ opts.title }}</h3>
          <p>{{ opts.message }}</p>
          <footer class="confirm-modal-actions">
            <button class="secondary" (click)="cancel()">{{ opts.cancelText ?? 'Cancelar' }}</button>
            <button
              type="button"
              [class.confirm-btn-dangerous]="opts.isDangerous"
              (click)="confirm()"
            >
              {{ opts.confirmText ?? 'Confirmar' }}
            </button>
          </footer>
        </article>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly dialogService = inject(ConfirmDialogService);

  confirm(): void {
    this.dialogService.resolve(true);
  }

  cancel(): void {
    this.dialogService.resolve(false);
  }
}
