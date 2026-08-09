import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth-user.interface';

// Endpoints de administración de la biblioteca de preguntas. Devuelven la
// respuesta correcta (isCorrect) y los test cases ocultos: esta vista es
// para el reclutador, no para el candidato (ver AttemptsController para la
// vista sanitizada que sí usa el candidato). Protegido y scoped por
// organización — admin y reclutador tienen el mismo acceso completo.
@ApiTags('questions')
@ApiBearerAuth()
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista preguntas de la biblioteca, con filtros opcionales' })
  findAll(@Query() query: QueryQuestionsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de una pregunta' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.findOne(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una nueva pregunta' })
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.create(user.organizationId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualiza una pregunta existente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionsService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una pregunta' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.remove(user.organizationId, id);
  }
}
