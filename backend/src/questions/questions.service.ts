import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, QuestionType } from './entities/question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly optionRepository: Repository<QuestionOption>,
  ) {}

  async findAll(organizationId: string, query: QueryQuestionsDto): Promise<Question[]> {
    const qb = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.options', 'option')
      .where('question.organization_id = :organizationId', { organizationId })
      .orderBy('question.createdAt', 'DESC')
      .addOrderBy('option.position', 'ASC');

    if (query.category) {
      qb.andWhere('question.category = :category', { category: query.category });
    }
    if (query.difficulty) {
      qb.andWhere('question.difficulty = :difficulty', { difficulty: query.difficulty });
    }
    if (query.type) {
      qb.andWhere('question.type = :type', { type: query.type });
    }

    return qb.getMany();
  }

  async findOne(organizationId: string, id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id, organizationId },
      relations: { options: true },
      order: { options: { position: 'ASC' } },
    });

    if (!question) {
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
    const question = await this.findOne(organizationId, id);

    Object.assign(question, {
      title: dto.title ?? question.title,
      statement: dto.statement ?? question.statement,
      category: dto.category ?? question.category,
      difficulty: dto.difficulty ?? question.difficulty,
      type: dto.type ?? question.type,
      codeTemplate: dto.codeTemplate ?? question.codeTemplate,
      testCases: dto.testCases ?? question.testCases,
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
    const result = await this.questionRepository.delete({ id, organizationId });

    if (result.affected === 0) {
      throw new NotFoundException(`Pregunta ${id} no encontrada`);
    }
  }
}
