import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, inject } from '@angular/core';

// Botón pequeño "ⓘ" que muestra una explicación corta al hacer click, para
// que quien use la app (o vea la demo) entienda de un vistazo qué hace una
// funcionalidad sin tener que preguntar. Se cierra solo al hacer click afuera
// o al volver a hacer click en el botón.
@Component({
  selector: 'app-info-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="info-button-wrap">
      <button
        type="button"
        class="info-button"
        [attr.aria-label]="'Info: ' + label"
        [attr.aria-expanded]="open"
        (click)="toggle($event)"
      >
        ⓘ
      </button>
      @if (open) {
        <div class="info-button-popover" role="tooltip">{{ text }}</div>
      }
    </span>
  `,
  styles: [
    `
      .info-button-wrap {
        position: relative;
        display: inline-block;
        margin-left: 0.35rem;
        vertical-align: middle;
      }
      .info-button {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.2rem;
        height: 1.2rem;
        border-radius: 999px;
        font-size: 0.75rem;
        line-height: 1;
        color: var(--pico-primary, #4f46e5);
        background: color-mix(in srgb, var(--pico-primary, #4f46e5) 12%, transparent);
        font-weight: 700;
      }
      .info-button:hover,
      .info-button:focus-visible {
        background: color-mix(in srgb, var(--pico-primary, #4f46e5) 22%, transparent);
      }
      .info-button-popover {
        position: absolute;
        z-index: 20;
        top: 1.5rem;
        left: 0;
        width: max-content;
        max-width: 20rem;
        padding: 0.6rem 0.75rem;
        border-radius: var(--pico-border-radius, 0.5rem);
        background: var(--pico-card-background-color, #fff);
        border: 1px solid var(--pico-muted-border-color, #ccc);
        box-shadow: var(--card-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
        font-size: 0.85rem;
        font-weight: 400;
        line-height: 1.4;
        color: var(--pico-color);
      }
    `,
  ],
})
export class InfoButtonComponent {
  @Input({ required: true }) text = '';
  @Input() label = 'ayuda';

  open = false;

  private readonly host = inject(ElementRef);

  toggle(event: Event): void {
    event.stopPropagation();
    this.open = !this.open;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.open && !this.host.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }
}
