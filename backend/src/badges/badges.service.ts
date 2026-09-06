import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateBadge } from './entities/candidate-badge.entity';
import { BADGE_CATALOG, BadgeCode, BadgeDefinition } from './badge-catalog';
import { Attempt, AttemptStatus } from '../attempts/entities/attempt.entity';
import { CandidateLevel } from '../assessments/level.util';

@Injectable()
export class BadgesService {
  constructor(
    @InjectRepository(CandidateBadge)
    private readonly badgeRepository: Repository<CandidateBadge>,
    @InjectRepository(Attempt)
    private readonly attemptRepository: Repository<Attempt>,
  ) {}

  // Se llama SOLO al completar un intento de PRÁCTICA (candidateId presente
  // — ver AttemptsService.finish). Devuelve únicamente las insignias NUEVAS
  // otorgadas en esta llamada (no las que el candidato ya tenía), para que
  // el frontend pueda mostrar un aviso de "insignia desbloqueada".
  async evaluateAndAward(params: {
    candidateId: string;
    attemptId: string;
    score: number;
    maxScore: number;
    level: CandidateLevel | null;
  }): Promise<BadgeDefinition[]> {
    const existing = await this.badgeRepository.find({
      where: { candidateId: params.candidateId },
    });
    const alreadyEarned = new Set(existing.map((b) => b.badgeCode));

    // Cuenta TODOS los intentos COMPLETED del candidato, incluido el que se
    // acaba de guardar como COMPLETED (AttemptsService.finish lo persiste
    // antes de llamar acá) — por eso completedCount === 1 significa "este
    // es su primer intento completado".
    const completedCount = await this.attemptRepository.count({
      where: { candidateId: params.candidateId, status: AttemptStatus.COMPLETED },
    });

    const toAward: BadgeCode[] = [];

    if (completedCount === 1) toAward.push('FIRST_ATTEMPT_COMPLETED');
    if (completedCount === 5) toAward.push('MILESTONE_5_ATTEMPTS');
    if (completedCount === 10) toAward.push('MILESTONE_10_ATTEMPTS');
    if (params.maxScore > 0 && params.score === params.maxScore) toAward.push('PERFECT_SCORE');
    if (params.level) toAward.push(`LEVEL_${params.level}` as BadgeCode);

    const newCodes = [...new Set(toAward)].filter((code) => !alreadyEarned.has(code));
    if (newCodes.length === 0) return [];

    await this.badgeRepository.save(
      newCodes.map((code) =>
        this.badgeRepository.create({
          candidateId: params.candidateId,
          badgeCode: code,
          sourceAttemptId: params.attemptId,
        }),
      ),
    );

    return newCodes.map((code) => BADGE_CATALOG[code]);
  }

  async listForCandidate(candidateId: string): Promise<Array<BadgeDefinition & { earnedAt: Date }>> {
    const rows = await this.badgeRepository.find({
      where: { candidateId },
      order: { earnedAt: 'ASC' },
    });

    return rows.map((row) => ({ ...BADGE_CATALOG[row.badgeCode as BadgeCode], earnedAt: row.earnedAt }));
  }
}
