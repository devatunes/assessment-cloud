import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@ApiTags('assessments')
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los assessments creados' })
  findAll() {
    return this.assessmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un assessment con sus preguntas (vista de administración)' })
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un assessment a partir de preguntas de la biblioteca' })
  create(@Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(dto);
  }
}
