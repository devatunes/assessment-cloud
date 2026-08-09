import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from './entities/assessment.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { Question } from '../questions/entities/question.entity';
import { ContentVisibility } from '../question-banks/entities/question-bank.entity';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  findAll(organizationId: string): Promise<Assessment[]> {
    return this.assessmentRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
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
    // Filtro por organization_id O visibility=PUBLIC: un assessment puede
    // usar preguntas propias o públicas de otra organización (de solo
    // lectura), pero NUNCA una pregunta privada ajena (fuga cross-tenant ya
    // identificada en revisión).
    const foundQuestions = await this.questionRepository
      .createQueryBuilder('question')
      .where('question.id IN (:...ids)', { ids: dto.questionIds })
      .andWhere('(question.organization_id = :organizationId OR question.visibility = :public)', {
        organizationId,
        public: ContentVisibility.PUBLIC,
      })
      .getMany();

    if (foundQuestions.length !== dto.questionIds.length) {
      throw new BadRequestException(
        'Una o más preguntas seleccionadas no existen en la biblioteca',
      );
    }

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
}
