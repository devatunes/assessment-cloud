import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

// Paginador genérico para cualquier lista paginada del backend
// (PaginatedResult<T>). Se oculta solo si todo cabe en una página — no hay
// nada que paginar entonces.
@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (total > pageSize) {
      <nav class="paginator">
        <button class="secondary" [disabled]="page <= 1" (click)="goTo(page - 1)">← Anterior</button>
        <span class="paginator-label">Página {{ page }} de {{ totalPages }} · {{ total }} en total</span>
        <button class="secondary" [disabled]="page >= totalPages" (click)="goTo(page + 1)">Siguiente →</button>
      </nav>
    }
  `,
})
export class PaginatorComponent {
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() total = 0;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.pageChange.emit(page);
  }
}
