export type BadgeCode =
  | 'FIRST_ATTEMPT_COMPLETED'
  | 'MILESTONE_5_ATTEMPTS'
  | 'MILESTONE_10_ATTEMPTS'
  | 'PERFECT_SCORE'
  | 'LEVEL_JUNIOR'
  | 'LEVEL_SEMISENIOR'
  | 'LEVEL_SENIOR';

export interface BadgeDefinition {
  code: BadgeCode;
  icon: string;
  label: string;
  description: string;
}

// Catálogo fijo en código (no configurable por el admin, a propósito: evita
// una UI/entidad adicional para algo que hoy no lo necesita). Extender
// significa agregar un caso acá + su regla en BadgesService.evaluateAndAward.
export const BADGE_CATALOG: Record<BadgeCode, BadgeDefinition> = {
  FIRST_ATTEMPT_COMPLETED: {
    code: 'FIRST_ATTEMPT_COMPLETED',
    icon: '🎯',
    label: 'Primer simulacro completado',
    description: 'Completaste tu primer simulacro de práctica.',
  },
  MILESTONE_5_ATTEMPTS: {
    code: 'MILESTONE_5_ATTEMPTS',
    icon: '🔥',
    label: 'Racha de práctica',
    description: 'Completaste 5 simulacros de práctica.',
  },
  MILESTONE_10_ATTEMPTS: {
    code: 'MILESTONE_10_ATTEMPTS',
    icon: '⭐',
    label: 'Practicante constante',
    description: 'Completaste 10 simulacros de práctica.',
  },
  PERFECT_SCORE: {
    code: 'PERFECT_SCORE',
    icon: '🏆',
    label: 'Puntaje perfecto',
    description: 'Respondiste todo correctamente en un simulacro.',
  },
  LEVEL_JUNIOR: {
    code: 'LEVEL_JUNIOR',
    icon: '🥉',
    label: 'Nivel Junior',
    description: 'Alcanzaste el nivel Junior en un simulacro.',
  },
  LEVEL_SEMISENIOR: {
    code: 'LEVEL_SEMISENIOR',
    icon: '🥈',
    label: 'Nivel Semisenior',
    description: 'Alcanzaste el nivel Semisenior en un simulacro.',
  },
  LEVEL_SENIOR: {
    code: 'LEVEL_SENIOR',
    icon: '🥇',
    label: 'Nivel Senior',
    description: 'Alcanzaste el nivel Senior en un simulacro.',
  },
};
