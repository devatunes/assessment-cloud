import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { RunCodeDto } from './dto/run-code.dto';

// Endpoints que usa el candidato para resolver un assessment. Las preguntas
// que devuelven estos endpoints están sanitizadas (sin isCorrect, sin test
// cases ocultos) — ver AttemptsService.buildSanitizedView.
@ApiTags('attempts')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post()
  @ApiOperation({ summary: 'Inicia un intento sobre un assessment' })
  create(@Body() dto: CreateAttemptDto) {
    return this.attemptsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el estado actual de un intento' })
  findOne(@Param('id') id: string) {
    return this.attemptsService.findOne(id);
  }

  @Put(':id/answers/:questionId')
  @ApiOperation({ summary: 'Guarda/actualiza la respuesta a una pregunta' })
  submitAnswer(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.attemptsService.submitAnswer(id, questionId, dto);
  }

  @Post(':id/questions/:questionId/run')
  @ApiOperation({
    summary: 'Ejecuta el código del candidato contra los test cases visibles',
  })
  runCode(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: RunCodeDto,
  ) {
    return this.attemptsService.runCode(id, questionId, dto.code);
  }

  @Post(':id/finish')
  @ApiOperation({ summary: 'Finaliza el intento y calcula el score' })
  finish(@Param('id') id: string) {
    return this.attemptsService.finish(id);
  }
}
