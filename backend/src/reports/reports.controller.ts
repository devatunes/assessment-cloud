import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth-user.interface';

// Vista "grupal": dashboard de toda la organización, agrupado por assessment
// y por categoría de pregunta.
@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard general: assessments comparados + desglose por categoría' })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.getOrganizationOverview(user.organizationId);
  }

  @Get('candidates')
  @ApiOperation({
    summary:
      'Historial de candidatos agrupado por correo, a través de todos los assessments y años, con filtros opcionales',
  })
  @ApiQuery({ name: 'track', required: false })
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'year', required: false, type: Number })
  candidatesHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('track') track?: string,
    @Query('specialty') specialty?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getCandidatesHistory(user.organizationId, {
      track,
      specialty,
      year: year ? Number(year) : undefined,
    });
  }
}
