import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from './entities/assessment.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { Question } from '../questions/entities/question.entity';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  findAll(): Promise<Assessment[]> {
    return this.assessmentRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Assessment> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id },
      relations: { questions: { question: { options: true } } },
      order: { questions: { position: 'ASC' } },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} no encontrado`);
    }

    return assessment;
  }

  async create(dto: CreateAssessmentDto): Promise<Assessment> {
    const foundQuestions = await this.questionRepository
      .createQueryBuilder('question')
      .where('question.id IN (:...ids)', { ids: dto.questionIds })
      .getMany();

    if (foundQuestions.length !== dto.questionIds.length) {
      throw new BadRequestException(
        'Una o más preguntas seleccionadas no existen en la biblioteca',
      );
    }

    const assessment = this.assessmentRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      questions: dto.questionIds.map((questionId, position) =>
        Object.assign(new AssessmentQuestion(), { questionId, position }),
      ),
    });

    const saved = await this.assessmentRepository.save(assessment);

    return this.findOne(saved.id);
  }
}
