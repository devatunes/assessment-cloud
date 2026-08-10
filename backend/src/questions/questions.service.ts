import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, QuestionType } from './entities/question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { ContentVisibility } from '../question-banks/entities/question-bank.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { PaginatedResult, paginate } from '../common/paginated-result';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly optionRepository: Repository<QuestionOption>,
  ) {}

  // Biblioteca visible: las propias de la organización + las PÚBLICAS de
  // cualquier otra (de solo lectura, ver update/remove más abajo).
  async findAll(organizationId: string, query: QueryQuestionsDto): Promise<PaginatedResult<Question>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const filtered = this.questionRepository
      .createQueryBuilder('question')
      .where('(question.organization_id = :organizationId OR question.visibility = :public)', {
        organizationId,
        public: ContentVisibility.PUBLIC,
      });

    if (query.category) {
      filtered.andWhere('question.category = :category', { category: query.category });
    }
    if (query.difficulty) {
      filtered.andWhere('question.difficulty = :difficulty', { difficulty: query.difficulty });
    }
    if (query.type) {
      filtered.andWhere('question.type = :type', { type: query.type });
    }

    const total = await filtered.getCount();

    // Paginar directo sobre un query con leftJoinAndSelect a "options" (una
    // relación 1:N) rompería: skip/take se aplicarían a las filas SQL ya
    // multiplicadas por cada opción, no a preguntas distintas. Por eso se
    // pagina primero solo IDs, y se hace un segundo query con el join para
    // esa página exacta.
    const pageIds = await filtered
      .clone()
      .select('question.id')
      .orderBy('question.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    if (pageIds.length === 0) {
      return paginate<Question>([], total, page, pageSize);
    }

    const questions = await this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.options', 'option')
      .where('question.id IN (:...ids)', { ids: pageIds.map((q) => q.id) })
      .orderBy('question.createdAt', 'DESC')
      .addOrderBy('option.position', 'ASC')
      .getMany();

    return paginate(questions, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: { options: true },
      order: { options: { position: 'ASC' } },
    });

    if (!question || (question.organizationId !== organizationId && question.visibility !== ContentVisibility.PUBLIC)) {
      throw new NotFoundException(`Pregunta ${id} no encontrada`);
    }

    return question;
  }

  async create(organizationId: string, dto: CreateQuestionDto): Promise<Question> {
    const question = this.questionRepository.create({
      organizationId,
      title: dto.title,
      statement: dto.statement,
      category: dto.category,
      difficulty: dto.difficulty,
      type: dto.type,
      codeTemplate: dto.type === QuestionType.CODE ? dto.codeTemplate ?? null : null,
      testCases: dto.type === QuestionType.CODE ? (dto.testCases ?? null) : null,
      explanation: dto.explanation ?? null,
      visibility: dto.visibility ?? ContentVisibility.PRIVATE,
      options:
        dto.type === QuestionType.MULTIPLE_CHOICE
          ? (dto.options ?? []).map((option, position) =>
              Object.assign(new QuestionOption(), {
                text: option.text,
                isCorrect: option.isCorrect,
                position,
              }),
            )
          : [],
    });

    return this.questionRepository.save(question);
  }

  async update(organizationId: string, id: string, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.getOwnedQuestion(organizationId, id);

    Object.assign(question, {
      title: dto.title ?? question.title,
      statement: dto.statement ?? question.statement,
      category: dto.category ?? question.category,
      difficulty: dto.difficulty ?? question.difficulty,
      type: dto.type ?? question.type,
      codeTemplate: dto.codeTemplate ?? question.codeTemplate,
      testCases: dto.testCases ?? question.testCases,
      explanation: dto.explanation ?? question.explanation,
      visibility: dto.visibility ?? question.visibility,
    });

    if (dto.options) {
      // Borra las opciones anteriores explícitamente: dejar que TypeORM lo
      // infiera del cascade reemplazando el array requeriría que question_id
      // fuera nullable (orphanedRowAction intenta poner NULL antes de
      // borrar), y no lo es. Borrar-y-recrear es simple y siempre correcto.
      await this.optionRepository.delete({ questionId: id });
      question.options = dto.options.map((option, position) =>
        Object.assign(new QuestionOption(), {
          text: option.text,
          isCorrect: option.isCorrect,
          position,
        }),
      );
    }

    return this.questionRepository.save(question);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.getOwnedQuestion(organizationId, id);
    await this.questionRepository.delete({ id, organizationId });
  }

  // Copia una pregunta PÚBLICA (de cualquier organización) a la biblioteca
  // privada de quien la duplica — es la única forma de "editar" contenido
  // público: nunca se modifica el original de otra organización.
  async duplicate(organizationId: string, id: string): Promise<Question> {
    const source = await this.findOne(organizationId, id);

    const copy = this.questionRepository.create({
      organizationId,
      title: `${source.title} (copia)`,
      statement: source.statement,
      category: source.category,
      difficulty: source.difficulty,
      type: source.type,
      codeTemplate: source.codeTemplate,
      testCases: source.testCases,
      explanation: source.explanation,
      visibility: ContentVisibility.PRIVATE,
      options: source.options.map((option) =>
        Object.assign(new QuestionOption(), {
          text: option.text,
          isCorrect: option.isCorrect,
          position: option.position,
        }),
      ),
    });

    return this.questionRepository.save(copy);
  }

  // Mutaciones (update/remove) exigen ser dueño — a diferencia de findOne,
  // que también permite LEER contenido público de otras organizaciones.
  private async getOwnedQuestion(organizationId: string, id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: { options: true },
    });

    if (!question) {
      throw new NotFoundException(`Pregunta ${id} no encontrada`);
    }
    if (question.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Esta pregunta es de solo lectura (pertenece a otra organización). Cópiala a tu biblioteca para editarla.',
      );
    }

    return question;
  }
}
