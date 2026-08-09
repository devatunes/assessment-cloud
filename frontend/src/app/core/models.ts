// --- Auth de organización (staff que recluta) ---

export type UserRole = 'ADMIN' | 'RECRUITER';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: CurrentUser;
}

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'MULTIPLE_CHOICE' | 'CODE';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  position?: number;
}

export interface QuestionTestCase {
  input: unknown;
  expectedOutput: string;
  hidden: boolean;
}

export interface Question {
  id: string;
  title: string;
  statement: string;
  category: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  codeTemplate: string | null;
  testCases: QuestionTestCase[] | null;
  options: QuestionOption[];
  createdAt: string;
}

export interface CreateQuestionPayload {
  title: string;
  statement: string;
  category: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  options?: { text: string; isCorrect: boolean }[];
  codeTemplate?: string;
  testCases?: QuestionTestCase[];
}

export type AssessmentVisibility = 'OFFICIAL' | 'PRACTICE';

export interface AssessmentLevelThresholds {
  junior?: number;
  semisenior?: number;
  senior?: number;
}

export interface Assessment {
  id: string;
  name: string;
  description: string | null;
  visibility: AssessmentVisibility;
  levelThresholds: AssessmentLevelThresholds | null;
  createdAt: string;
  questions?: { questionId: string; position: number; question: Question }[];
}

export type InvitationStatus = 'PENDING' | 'STARTED' | 'COMPLETED' | 'EXPIRED';

export interface Invitation {
  id: string;
  assessmentId: string;
  candidateName: string | null;
  candidateEmail: string | null;
  token: string;
  status: InvitationStatus;
  attemptId: string | null;
  expiresAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface InvitationPublicView {
  status: InvitationStatus;
  assessmentId: string;
  assessmentName: string;
  assessmentDescription: string | null;
  candidateName: string | null;
  attemptId: string | null;
}

export interface SanitizedQuestion {
  id: string;
  title: string;
  statement: string;
  category: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  position: number;
  codeTemplate: string | null;
  visibleTestCases: { input: unknown; expectedOutput: string }[];
  options: { id: string; text: string }[];
}

export interface AttemptWithQuestions {
  id: string;
  assessmentId: string;
  assessmentName: string;
  candidateName: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  maxScore: number;
  questions: SanitizedQuestion[];
}

export interface RunResult {
  results: Array<{
    input: unknown;
    expected: string;
    actual: string;
    stderr: string;
    timedOut: boolean;
    passed: boolean;
  }>;
  allPassed: boolean;
  error?: string;
}

export interface AttemptResult {
  id: string;
  assessmentId: string;
  assessmentName: string;
  candidateName: string;
  status: string;
  score: number | null;
  maxScore: number;
  // Nivel alcanzado según los umbrales que configuró el evaluador para este
  // assessment; null si no configuró niveles.
  level: 'JUNIOR' | 'SEMISENIOR' | 'SENIOR' | null;
  startedAt: string;
  finishedAt: string | null;
  breakdown: Array<{
    questionId: string;
    title: string;
    type: QuestionType;
    isCorrect: boolean;
    points: number;
  }>;
}
