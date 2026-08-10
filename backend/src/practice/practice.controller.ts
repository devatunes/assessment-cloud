import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PracticeService } from './practice.service';
import { CandidateJwtAuthGuard } from '../candidate-auth/candidate-jwt-auth.guard';
import { CurrentCandidate } from '../candidate-auth/current-candidate.decorator';
import { AuthenticatedCandidate } from '../candidate-auth/candidate-auth-user.interface';
import { PaginationQueryDto } from '../common/pagination-query.dto';

@ApiTags('practice')
@ApiBearerAuth()
@Controller('practice')
@UseGuards(CandidateJwtAuthGuard)
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('assessments')
  @ApiOperation({ summary: 'Catálogo público de simulacros disponibles para practicar' })
  listCatalog(@Query() query: PaginationQueryDto) {
    return this.practiceService.listCatalog(query);
  }

  @Post('assessments/:id/start')
  @ApiOperation({ summary: 'Inicia (o retoma) un intento de práctica sobre un simulacro' })
  start(@Param('id') id: string, @CurrentCandidate() candidate: AuthenticatedCandidate) {
    return this.practiceService.start(candidate, id);
  }

  @Get('my-attempts')
  @ApiOperation({ summary: 'Historial de intentos de práctica del candidato autenticado' })
  myAttempts(@Query() query: PaginationQueryDto, @CurrentCandidate() candidate: AuthenticatedCandidate) {
    return this.practiceService.myAttempts(candidate.candidateId, query);
  }

  @Get('my-badges')
  @ApiOperation({ summary: 'Insignias obtenidas por el candidato autenticado' })
  myBadges(@CurrentCandidate() candidate: AuthenticatedCandidate) {
    return this.practiceService.myBadges(candidate.candidateId);
  }
}
