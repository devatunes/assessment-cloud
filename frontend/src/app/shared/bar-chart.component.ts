import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface BarChartItem {
  label: string;
  value: number;
}

// Gráfica de barras horizontales hecha con CSS puro (sin librería externa):
// suficiente para los reportes de esta app y evita sumar una dependencia
// solo para un puñado de barras.
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bar-chart">
      @for (item of items; track item.label) {
        <div class="bar-row">
          <span class="bar-label">{{ item.label }}</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              [style.width.%]="maxValue > 0 ? Math.min(100, (item.value / maxValue) * 100) : 0"
            ></div>
          </div>
          <span class="bar-value">{{ item.value | number: '1.0-1' }}{{ suffix }}</span>
        </div>
      }
      @if (items.length === 0) {
        <p><small>Sin datos todavía.</small></p>
      }
    </div>
  `,
})
export class BarChartComponent {
  @Input({ required: true }) items: BarChartItem[] = [];
  @Input() maxValue = 100;
  @Input() suffix = '%';

  protected readonly Math = Math;
}
