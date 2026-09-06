import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReportsService } from '../../core/reports.service';
import { AssessmentReport } from '../../core/models';
import { BarChartComponent, BarChartItem } from '../../shared/bar-chart.component';
import { InfoButtonComponent } from '../../shared/info-button.component';

const LEVEL_LABELS: Record<string, string> = {
  JUNIOR: 'Junior',
  SEMISENIOR: 'Semisenior',
  SENIOR: 'Senior',
};

@Component({
  selector: 'app-assessment-report',
  standalone: true,
  imports: [CommonModule, RouterLink, BarChartComponent, InfoButtonComponent],
  templateUrl: './assessment-report.component.html',
})
export class AssessmentReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportsService = inject(ReportsService);

  report: AssessmentReport | null = null;
  loading = false;
  error: string | null = null;
  exporting = false;

  private assessmentId = '';

  ngOnInit(): void {
    this.assessmentId = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;

    this.reportsService.getAssessmentReport(this.assessmentId).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el reporte';
        this.loading = false;
      },
    });
  }

  get levelChartItems(): BarChartItem[] {
    if (!this.report) return [];
    return this.report.levelDistribution.map((entry) => ({
      label: entry.level ? LEVEL_LABELS[entry.level] : 'Sin nivel',
      value: entry.count,
    }));
  }

  get levelChartMax(): number {
    return Math.max(1, ...this.levelChartItems.map((i) => i.value));
  }

  get questionChartItems(): BarChartItem[] {
    if (!this.report) return [];
    return this.report.questionStats.map((q) => ({ label: q.title, value: q.correctRate }));
  }

  exportCsv(): void {
    this.exporting = true;
    this.reportsService.exportCsv(this.assessmentId).subscribe({
      next: (blob) => {
        this.exporting = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${this.assessmentId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.exporting = false;
        this.error = 'No se pudo exportar el CSV';
      },
    });
  }
}
