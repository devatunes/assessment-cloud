import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';

// Endpoints de administración de la biblioteca de preguntas. Devuelven la
// respuesta correcta (isCorrect) y los test cases ocultos: esta vista es
// para el reclutador, no para el candidato (ver AttemptsController para la
// vista sanitizada que sí usa el candidato).
@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista preguntas de la biblioteca, con filtros opcionales' })
  findAll(@Query() query: QueryQuestionsDto) {
    return this.questionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de una pregunta' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una nueva pregunta' })
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualiza una pregunta existente' })
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una pregunta' })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }
}
