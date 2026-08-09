import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuestionBanksService } from './question-banks.service';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { AddQuestionsToBankDto } from './dto/add-questions-to-bank.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth-user.interface';

@ApiTags('question-banks')
@ApiBearerAuth()
@Controller('question-banks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionBanksController {
  constructor(private readonly service: QuestionBanksService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los bancos de preguntas de la organización' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un banco con sus preguntas' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un banco de preguntas' })
  create(@Body() dto: CreateQuestionBankDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(user.organizationId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualiza nombre/descripción de un banco' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionBankDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un banco (las preguntas en sí no se borran)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(user.organizationId, id);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Agrega una o más preguntas al banco (idempotente)' })
  addQuestions(
    @Param('id') id: string,
    @Body() dto: AddQuestionsToBankDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addQuestions(user.organizationId, id, dto);
  }

  @Delete(':id/questions/:questionId')
  @ApiOperation({ summary: 'Quita una pregunta del banco' })
  removeQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeQuestion(user.organizationId, id, questionId);
  }
}
