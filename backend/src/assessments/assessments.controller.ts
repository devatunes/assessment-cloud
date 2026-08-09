import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth-user.interface';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los assessments creados' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un assessment con sus preguntas (vista de administración)' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.findOne(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un assessment a partir de preguntas de la biblioteca' })
  create(@Body() dto: CreateAssessmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.create(user.organizationId, dto);
  }
}
