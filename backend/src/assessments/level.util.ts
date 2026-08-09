import { AssessmentLevelThresholds } from './entities/assessment.entity';

export type CandidateLevel = 'JUNIOR' | 'SEMISENIOR' | 'SENIOR';

// Nivel alcanzado según el score % del candidato vs los umbrales que
// configuró el evaluador en el assessment. Se evalúa de mayor a menor
// exigencia: un score que alcanza "senior" no debe caer en "junior".
// Sin umbrales configurados (o ninguno alcanzado) => null (sin nivel).
export function computeLevel(
  scorePercentage: number,
  thresholds: AssessmentLevelThresholds | null | undefined,
): CandidateLevel | null {
  if (!thresholds) return null;

  if (thresholds.senior !== undefined && scorePercentage >= thresholds.senior) {
    return 'SENIOR';
  }
  if (thresholds.semisenior !== undefined && scorePercentage >= thresholds.semisenior) {
    return 'SEMISENIOR';
  }
  if (thresholds.junior !== undefined && scorePercentage >= thresholds.junior) {
    return 'JUNIOR';
  }

  return null;
}
