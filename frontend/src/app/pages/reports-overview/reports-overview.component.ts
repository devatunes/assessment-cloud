import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportsService } from '../../core/reports.service';
import { OrganizationOverview, QUESTION_CATEGORY_LABELS, QuestionCategory } from '../../core/models';
import { BarChartComponent, BarChartItem } from '../../shared/bar-chart.component';

@Component({
  selector: 'app-reports-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, BarChartComponent],
  templateUrl: './reports-overview.component.html',
})
export class ReportsOverviewComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  overview: OrganizationOverview | null = null;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loading = true;
    this.reportsService.getOverview().subscribe({
      next: (overview) => {
        this.overview = overview;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el dashboard';
        this.loading = false;
      },
    });
  }

  get assessmentScoreChartItems(): BarChartItem[] {
    if (!this.overview) return [];
    return this.overview.assessments
      .filter((a) => a.averageScorePercentage !== null)
      .map((a) => ({ label: a.assessmentName, value: a.averageScorePercentage! }));
  }

  get categoryChartItems(): BarChartItem[] {
    if (!this.overview) return [];
    return this.overview.categoryBreakdown.map((c) => ({
      label: QUESTION_CATEGORY_LABELS[c.category as QuestionCategory] ?? c.category,
      value: c.correctRate,
    }));
  }
}
