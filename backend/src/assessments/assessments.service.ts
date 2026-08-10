import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from './entities/assessment.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { Question } from '../questions/entities/question.entity';
import { ContentVisibility } from '../question-banks/entities/question-bank.entity';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PaginatedResult, paginate } from '../common/paginated-result';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(AssessmentQuestion)
    private readonly assessmentQuestionRepository: Repository<AssessmentQuestion>,
  ) {}

  async findAll(organizationId: string, query: PaginationQueryDto): Promise<PaginatedResult<Assessment>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await this.assessmentRepository.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return paginate(items, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string): Promise<Assessment> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id, organizationId },
      relations: { questions: { question: { options: true } } },
      order: { questions: { position: 'ASC' } },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} no encontrado`);
    }

    return assessment;
  }

  async create(organizationId: string, dto: CreateAssessmentDto): Promise<Assessment> {
    await this.assertQuestionsUsable(organizationId, dto.questionIds);

    const assessment = this.assessmentRepository.create({
      organizationId,
      name: dto.name,
      description: dto.description ?? null,
      visibility: dto.visibility,
      levelThresholds: dto.levelThresholds ?? null,
      timeLimitMinutes: dto.timeLimitMinutes ?? null,
      questions: dto.questionIds.map((questionId, position) =>
        Object.assign(new AssessmentQuestion(), { questionId, position }),
      ),
    });

    const saved = await this.assessmentRepository.save(assessment);

    return this.findOne(organizationId, saved.id);
  }

  async update(organizationId: string, id: string, dto: UpdateAssessmentDto): Promise<Assessment> {
    // findOne ya scopea por organizationId (los assessments, a diferencia de
    // preguntas/bancos, no tienen un concepto de "público" cross-org): si no
    // es de esta organización, simplemente no se encuentra.
    const assessment = await this.findOne(organizationId, id);

    Object.assign(assessment, {
      name: dto.name ?? assessment.name,
      description: dto.description ?? assessment.description,
      visibility: dto.visibility ?? assessment.visibility,
      levelThresholds: dto.levelThresholds ?? assessment.levelThresholds,
      timeLimitMinutes: dto.timeLimitMinutes ?? assessment.timeLimitMinutes,
    });

    if (dto.questionIds) {
      await this.assertQuestionsUsable(organizationId, dto.questionIds);

      // Igual que QuestionsService.update() con las opciones: borrar-y-recrear
      // explícito. assessment_id es parte de la PK compuesta de
      // assessment_question (no puede quedar NULL), así que el
      // orphanedRowAction del cascade no sirve aquí.
      await this.assessmentQuestionRepository.delete({ assessmentId: id });
      assessment.questions = dto.questionIds.map((questionId, position) =>
        Object.assign(new AssessmentQuestion(), { questionId, position }),
      );
    }

    await this.assessmentRepository.save(assessment);

    return this.findOne(organizationId, id);
  }

  // Un assessment puede usar preguntas propias o públicas de otra
  // organización (de solo lectura), pero NUNCA una pregunta privada ajena
  // (fuga cross-tenant ya identificada en revisión).
  private async assertQuestionsUsable(organizationId: string, questionIds: string[]): Promise<void> {
    const foundQuestions = await this.questionRepository
      .createQueryBuilder('question')
      .where('question.id IN (:...ids)', { ids: questionIds })
      .andWhere('(question.organization_id = :organizationId OR question.visibility = :public)', {
        organizationId,
        public: ContentVisibility.PUBLIC,
      })
      .getMany();

    if (foundQuestions.length !== questionIds.length) {
      throw new BadRequestException(
        'Una o más preguntas seleccionadas no existen en la biblioteca',
      );
    }
  }
}
