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
  ) {}

  async findAll(query: QueryQuestionsDto): Promise<Question[]> {
    const qb = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.options', 'option')
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

  async findOne(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: { options: true },
      order: { options: { position: 'ASC' } },
    });

    if (!question) {
      throw new NotFoundException(`Pregunta ${id} no encontrada`);
    }

    return question;
  }

  async create(dto: CreateQuestionDto): Promise<Question> {
    const question = this.questionRepository.create({
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

  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findOne(id);

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

  async remove(id: string): Promise<void> {
    const result = await this.questionRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Pregunta ${id} no encontrada`);
    }
  }
}
