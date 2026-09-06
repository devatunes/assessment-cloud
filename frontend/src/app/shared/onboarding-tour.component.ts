import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { OnboardingTourService } from '../core/onboarding-tour.service';

@Component({
  selector: 'app-onboarding-tour',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (tourService.steps(); as steps) {
      <div class="onboarding-overlay" (click)="tourService.finish()">
        <article class="onboarding-modal" (click)="$event.stopPropagation()">
          <header>
            <strong>{{ tourService.currentIndex() + 1 }} / {{ steps.length }}</strong>
          </header>
          <h3>{{ tourService.currentStep?.title }}</h3>
          <p>{{ tourService.currentStep?.body }}</p>
          <footer style="display: flex; justify-content: space-between; align-items: center">
            <a href="#" (click)="skip($event)">Omitir</a>
            <div style="display: flex; gap: 0.5rem">
              @if (tourService.currentIndex() > 0) {
                <button class="secondary" (click)="tourService.prev()">Anterior</button>
              }
              <button (click)="tourService.next()">
                {{ tourService.isLastStep ? 'Entendido' : 'Siguiente' }}
              </button>
            </div>
          </footer>
        </article>
      </div>
    }
  `,
})
export class OnboardingTourComponent {
  protected readonly tourService = inject(OnboardingTourService);

  skip(event: Event): void {
    event.preventDefault();
    this.tourService.finish();
  }
}
