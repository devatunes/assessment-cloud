import { QuestionDifficulty, QuestionType } from '../questions/entities/question.entity';
import { CandidateLevel } from '../assessments/level.util';
import { BadgeDefinition } from '../badges/badge-catalog';

// Vista de una pregunta tal como la ve el candidato: sin isCorrect en las
// opciones y sin los test cases marcados como hidden.
export type SanitizedQuestion = {
  id: string;
  title: string;
  statement: string;
  category: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  position: number;
  codeTemplate: string | null;
  visibleTestCases: Array<{ input: unknown; expectedOutput: string }>;
  options: Array<{ id: string; text: string }>;
  // Lo que el candidato ya había respondido, para restaurar el formulario
  // si recarga la página o retoma el intento en otra sesión/dispositivo —
  // la respuesta ya cuenta para el puntaje aunque la pantalla la mostrara
  // en blanco, pero eso confundía al candidato (parecía que se perdió).
  selectedOptionId: string | null;
  submittedCode: string | null;
};

export type AttemptWithQuestions = {
  id: string;
  assessmentId: string;
  assessmentName: string;
  candidateName: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  score: number | null;
  maxScore: number;
  // Momento en que el examen se corta automáticamente (startedAt +
  // assessment.timeLimitMinutes); null si el assessment no tiene límite.
  deadline: Date | null;
  questions: SanitizedQuestion[];
};

export type AttemptResult = {
  id: string;
  assessmentId: string;
  assessmentName: string;
  candidateName: string;
  status: string;
  score: number | null;
  maxScore: number;
  // Nivel alcanzado según los umbrales configurados en el assessment (ver
  // AssessmentLevelThresholds); null si el evaluador no configuró niveles.
  level: CandidateLevel | null;
  startedAt: Date;
  finishedAt: Date | null;
  breakdown: Array<{
    questionId: string;
    title: string;
    type: QuestionType;
    isCorrect: boolean;
    points: number;
    explanation: string | null;
  }>;
  // Insignias otorgadas EN ESTA llamada a finish() (vacío en getResult(), o
  // en un finish() repetido sobre un intento ya completado — ver
  // AttemptsService.finish). Solo se otorgan en intentos de práctica.
  newBadges: BadgeDefinition[];
};
