import { QuestionDifficulty, QuestionType } from '../questions/entities/question.entity';

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
