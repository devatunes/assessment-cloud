import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Assessment, AssessmentVisibility } from '../assessments/entities/assessment.entity';
import { AssessmentQuestion } from '../assessments/entities/assessment-question.entity';
import { Attempt, AttemptStatus } from '../attempts/entities/attempt.entity';
import { AttemptsService } from '../attempts/attempts.service';
import { AttemptWithQuestions } from '../attempts/attempts.types';
import { computeLevel } from '../assessments/level.util';
import { AuthenticatedCandidate } from '../candidate-auth/candidate-auth-user.interface';

@Injectable()
export class PracticeService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentQuestion)
    private readonly assessmentQuestionRepository: Repository<AssessmentQuestion>,
    @InjectRepository(Attempt)
    private readonly attemptRepository: Repository<Attempt>,
    private readonly attemptsService: AttemptsService,
  ) {}

  // Catálogo GLOBAL: simulacros de CUALQUIER organización, visibles para
  // cualquier candidato registrado (decisión ya validada con el usuario).
  async listCatalog() {
    const assessments = await this.assessmentRepository.find({
      where: { visibility: AssessmentVisibility.PRACTICE },
      order: { createdAt: 'DESC' },
    });

    if (assessments.length === 0) return [];

    const counts = await this.assessmentQuestionRepository
      .createQueryBuilder('aq')
      .select('aq.assessment_id', 'assessmentId')
      .addSelect('COUNT(*)', 'count')
      .where('aq.assessment_id IN (:...ids)', { ids: assessments.map((a) => a.id) })
      .groupBy('aq.assessment_id')
      .getRawMany<{ assessmentId: string; count: string }>();

    const countByAssessmentId = new Map(counts.map((c) => [c.assessmentId, Number(c.count)]));

    return assessments.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      timeLimitMinutes: a.timeLimitMinutes,
      questionCount: countByAssessmentId.get(a.id) ?? 0,
      createdAt: a.createdAt,
    }));
  }

  // Si ya hay un intento IN_PROGRESS de este candidato sobre este simulacro,
  // lo retoma (mismo espíritu de idempotencia que InvitationsService); a
  // diferencia de las invitaciones oficiales, sí se permiten reintentos: tras
  // un COMPLETED, la siguiente llamada arranca un intento nuevo.
  async start(candidate: AuthenticatedCandidate, assessmentId: string): Promise<AttemptWithQuestions> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId, visibility: AssessmentVisibility.PRACTICE },
    });

    if (!assessment) {
      throw new NotFoundException(`Simulacro ${assessmentId} no encontrado`);
    }

    const inProgress = await this.attemptRepository.findOne({
      where: {
        candidateId: candidate.candidateId,
        assessmentId,
        status: AttemptStatus.IN_PROGRESS,
      },
      order: { startedAt: 'DESC' },
    });

    if (inProgress) {
      return this.attemptsService.findOne(inProgress.id);
    }

    return this.attemptsService.create(
      { assessmentId, candidateName: candidate.name },
      candidate.candidateId,
    );
  }

  // Privacidad estructural, no un filtro post-hoc: solo se listan attempts
  // con candidateId propio. Los oficiales vía invitación nunca tienen
  // candidateId (ver AttemptsService.create), así que jamás aparecen acá —
  // y por el mismo motivo tampoco podrán aparecer en el reporte de una
  // organización cuando se construya (Fase 6).
  async myAttempts(candidateId: string) {
    const attempts = await this.attemptRepository.find({
      where: { candidateId },
      order: { startedAt: 'DESC' },
    });

    if (attempts.length === 0) return [];

    const assessmentIds = [...new Set(attempts.map((a) => a.assessmentId))];
    const assessments = await this.assessmentRepository.find({ where: { id: In(assessmentIds) } });
    const assessmentById = new Map(assessments.map((a) => [a.id, a]));

    return attempts.map((attempt) => {
      const assessment = assessmentById.get(attempt.assessmentId);
      const scorePercentage =
        attempt.score !== null && attempt.maxScore > 0
          ? (attempt.score / attempt.maxScore) * 100
          : 0;

      return {
        id: attempt.id,
        assessmentId: attempt.assessmentId,
        assessmentName: assessment?.name ?? '',
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.maxScore,
        level:
          attempt.score !== null
            ? computeLevel(scorePercentage, assessment?.levelThresholds ?? null)
            : null,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
      };
    });
  }
}
