import { QuestionDifficulty, QuestionType } from '../questions/entities/question.entity';
import { CandidateLevel } from '../assessments/level.util';

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
  }>;
};
