import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth-user.interface';

// Lado reclutador: reporte de un assessment propio (candidatos, niveles,
// tasa de acierto por pregunta).
@ApiTags('reports')
@ApiBearerAuth()
@Controller('assessments/:assessmentId/report')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentReportController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Reporte de un assessment: candidatos, niveles, acierto por pregunta' })
  get(@Param('assessmentId') assessmentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.getAssessmentReport(user.organizationId, assessmentId);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Exporta la tabla de candidatos del reporte en CSV' })
  async exportCsv(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.getAssessmentReportCsv(user.organizationId, assessmentId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${assessmentId}.csv"`);
    res.send(csv);
  }
}
