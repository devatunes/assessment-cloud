import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Assessment, AssessmentVisibility } from '../assessments/entities/assessment.entity';
import { Invitation, InvitationStatus } from '../invitations/entities/invitation.entity';
import { Attempt, AttemptStatus } from '../attempts/entities/attempt.entity';
import { AttemptAnswer } from '../attempts/entities/attempt-answer.entity';
import { Question } from '../questions/entities/question.entity';
import { computeLevel, CandidateLevel } from '../assessments/level.util';
import {
  AssessmentOverviewEntry,
  AssessmentReport,
  CandidateReportRow,
  CategoryOverviewEntry,
  LevelDistributionEntry,
  OrganizationOverview,
  QuestionStat,
} from './reports.types';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Attempt)
    private readonly attemptRepository: Repository<Attempt>,
    @InjectRepository(AttemptAnswer)
    private readonly answerRepository: Repository<AttemptAnswer>,
  ) {}

  async getAssessmentReport(organizationId: string, assessmentId: string): Promise<AssessmentReport> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId, organizationId },
      relations: { questions: { question: true } },
      order: { questions: { position: 'ASC' } },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} no encontrado`);
    }
    // Refuerzo estructural: la práctica libre es privada del candidato y
    // nunca se reporta a una organización (ver PracticeService.myAttempts).
    if (assessment.visibility !== AssessmentVisibility.OFFICIAL) {
      throw new BadRequestException('Los simulacros de práctica no generan reporte de organización');
    }

    const invitations = await this.invitationRepository.find({
      where: { assessmentId },
      order: { createdAt: 'DESC' },
    });

    const attemptIds = invitations
      .filter((inv): inv is Invitation & { attemptId: string } => !!inv.attemptId)
      .map((inv) => inv.attemptId);
    const attempts = attemptIds.length
      ? await this.attemptRepository.find({ where: { id: In(attemptIds) } })
      : [];
    const attemptById = new Map(attempts.map((a) => [a.id, a]));

    const candidates: CandidateReportRow[] = invitations.map((inv) => {
      const attempt = inv.attemptId ? attemptById.get(inv.attemptId) : undefined;
      const isScored = attempt?.status === AttemptStatus.COMPLETED && attempt.score !== null;
      const scorePercentage =
        isScored && attempt!.maxScore > 0 ? (attempt!.score! / attempt!.maxScore) * 100 : null;

      return {
        invitationId: inv.id,
        candidateName: inv.candidateName,
        candidateEmail: inv.candidateEmail,
        status: inv.status,
        score: attempt?.score ?? null,
        maxScore: attempt?.maxScore ?? null,
        scorePercentage,
        level: isScored ? computeLevel(scorePercentage ?? 0, assessment.levelThresholds) : null,
        completedAt: inv.completedAt ? inv.completedAt.toISOString() : null,
      };
    });

    const completed = candidates.filter((c) => c.status === InvitationStatus.COMPLETED).length;
    const totalInvitations = invitations.length;
    const scoredPercentages = candidates
      .filter((c) => c.scorePercentage !== null)
      .map((c) => c.scorePercentage!);

    const levelCounts = new Map<string, number>();
    for (const c of candidates) {
      if (c.status !== InvitationStatus.COMPLETED) continue;
      const key = c.level ?? 'NONE';
      levelCounts.set(key, (levelCounts.get(key) ?? 0) + 1);
    }
    const levelDistribution: LevelDistributionEntry[] = [...levelCounts.entries()].map(
      ([key, count]) => ({ level: key === 'NONE' ? null : (key as CandidateLevel), count }),
    );

    const completedAttemptIds = attempts
      .filter((a) => a.status === AttemptStatus.COMPLETED)
      .map((a) => a.id);

    const statsByQuestionId = new Map<string, { correctRate: number; answered: number }>();
    if (completedAttemptIds.length > 0) {
      const rawStats = await this.answerRepository
        .createQueryBuilder('answer')
        .select('answer.question_id', 'questionId')
        .addSelect('AVG(CASE WHEN answer.is_correct THEN 1 ELSE 0 END)', 'correctRate')
        .addSelect('COUNT(*)', 'answered')
        .where('answer.attempt_id IN (:...ids)', { ids: completedAttemptIds })
        .groupBy('answer.question_id')
        .getRawMany<{ questionId: string; correctRate: string; answered: string }>();

      for (const row of rawStats) {
        statsByQuestionId.set(row.questionId, {
          correctRate: Number(row.correctRate) * 100,
          answered: Number(row.answered),
        });
      }
    }

    const questionStats: QuestionStat[] = assessment.questions.map((aq) => {
      const stat = statsByQuestionId.get(aq.questionId);
      return {
        questionId: aq.questionId,
        title: aq.question.title,
        category: aq.question.category,
        answered: stat?.answered ?? 0,
        correctRate: stat?.correctRate ?? 0,
      };
    });

    return {
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      totalInvitations,
      completed,
      completionRate: totalInvitations > 0 ? (completed / totalInvitations) * 100 : 0,
      averageScorePercentage:
        scoredPercentages.length > 0
          ? scoredPercentages.reduce((sum, v) => sum + v, 0) / scoredPercentages.length
          : null,
      levelDistribution,
      questionStats,
      candidates,
    };
  }

  async getAssessmentReportCsv(organizationId: string, assessmentId: string): Promise<string> {
    const report = await this.getAssessmentReport(organizationId, assessmentId);
    const header = ['Candidato', 'Correo', 'Estado', 'Score', 'Score %', 'Nivel', 'Completado el'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const rows = report.candidates.map((c) =>
      [
        c.candidateName ?? '',
        c.candidateEmail ?? '',
        c.status,
        c.score !== null ? String(c.score) : '',
        c.scorePercentage !== null ? c.scorePercentage.toFixed(1) : '',
        c.level ?? '',
        c.completedAt ?? '',
      ]
        .map(escape)
        .join(','),
    );

    return [header.map(escape).join(','), ...rows].join('\n');
  }

  // Vista "grupal": todos los assessments OFICIALES de la organización
  // comparados entre sí, más un desglose por categoría de pregunta (única
  // dimensión ya estructurada en el modelo de datos) para detectar en qué
  // áreas fallan más los candidatos en general.
  async getOrganizationOverview(organizationId: string): Promise<OrganizationOverview> {
    const assessments = await this.assessmentRepository.find({
      where: { organizationId, visibility: AssessmentVisibility.OFFICIAL },
      order: { createdAt: 'DESC' },
    });

    if (assessments.length === 0) {
      return { assessments: [], categoryBreakdown: [] };
    }

    const totalRows = await this.invitationRepository
      .createQueryBuilder('inv')
      .select('inv.assessment_id', 'assessmentId')
      .addSelect('COUNT(*)', 'total')
      .where('inv.organization_id = :organizationId', { organizationId })
      .groupBy('inv.assessment_id')
      .getRawMany<{ assessmentId: string; total: string }>();
    const totalByAssessmentId = new Map(totalRows.map((r) => [r.assessmentId, Number(r.total)]));

    const completedRows = await this.invitationRepository
      .createQueryBuilder('inv')
      .innerJoin(Attempt, 'attempt', 'attempt.id = inv.attempt_id')
      .select('inv.assessment_id', 'assessmentId')
      .addSelect('COUNT(*)', 'completed')
      .addSelect(
        'AVG(CASE WHEN attempt.max_score > 0 THEN (attempt.score::float / attempt.max_score) * 100 ELSE NULL END)',
        'avgScorePercentage',
      )
      .where('inv.organization_id = :organizationId', { organizationId })
      .andWhere('attempt.status = :completed', { completed: AttemptStatus.COMPLETED })
      .groupBy('inv.assessment_id')
      .getRawMany<{ assessmentId: string; completed: string; avgScorePercentage: string | null }>();
    const completedByAssessmentId = new Map(
      completedRows.map((r) => [
        r.assessmentId,
        { completed: Number(r.completed), avg: r.avgScorePercentage !== null ? Number(r.avgScorePercentage) : null },
      ]),
    );

    const assessmentEntries: AssessmentOverviewEntry[] = assessments.map((a) => {
      const total = totalByAssessmentId.get(a.id) ?? 0;
      const completedInfo = completedByAssessmentId.get(a.id);
      const completed = completedInfo?.completed ?? 0;

      return {
        assessmentId: a.id,
        assessmentName: a.name,
        totalInvitations: total,
        completed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        averageScorePercentage: completedInfo?.avg ?? null,
      };
    });

    const categoryRows = await this.answerRepository
      .createQueryBuilder('answer')
      .innerJoin(Attempt, 'attempt', 'attempt.id = answer.attempt_id')
      .innerJoin(Assessment, 'assessment', 'assessment.id = attempt.assessment_id')
      .innerJoin(Question, 'question', 'question.id = answer.question_id')
      .select('question.category', 'category')
      .addSelect('AVG(CASE WHEN answer.is_correct THEN 1 ELSE 0 END)', 'correctRate')
      .addSelect('COUNT(*)', 'answered')
      .where('assessment.organization_id = :organizationId', { organizationId })
      .andWhere('assessment.visibility = :official', { official: AssessmentVisibility.OFFICIAL })
      .andWhere('attempt.status = :completed', { completed: AttemptStatus.COMPLETED })
      .groupBy('question.category')
      .orderBy('question.category', 'ASC')
      .getRawMany<{ category: string; correctRate: string; answered: string }>();

    const categoryBreakdown: CategoryOverviewEntry[] = categoryRows.map((row) => ({
      category: row.category,
      answered: Number(row.answered),
      correctRate: Number(row.correctRate) * 100,
    }));

    return { assessments: assessmentEntries, categoryBreakdown };
  }
}
