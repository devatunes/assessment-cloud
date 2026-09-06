// Forma estándar de cualquier endpoint de lista paginada del backend.
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Auth de organización (staff que recluta) ---

export type UserRole = 'ADMIN' | 'RECRUITER';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: CurrentUser;
}

export type UserStatus = 'PENDING_ACTIVATION' | 'ACTIVE';

// Fila de GET /users (listado de la organización, solo admin).
export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export type ContentVisibility = 'PRIVATE' | 'PUBLIC';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'MULTIPLE_CHOICE' | 'CODE';
export type QuestionCategory =
  | 'BACKEND'
  | 'FRONTEND'
  | 'FULLSTACK'
  | 'DEVOPS'
  | 'QA'
  | 'DATA'
  | 'MOBILE'
  | 'OTHER';

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  BACKEND: 'Backend',
  FRONTEND: 'Frontend',
  FULLSTACK: 'Fullstack',
  DEVOPS: 'DevOps',
  QA: 'QA',
  DATA: 'Datos',
  MOBILE: 'Móvil',
  OTHER: 'Otro',
};

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
  organizationId: string;
  title: string;
  statement: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  codeTemplate: string | null;
  testCases: QuestionTestCase[] | null;
  explanation: string | null;
  visibility: ContentVisibility;
  options: QuestionOption[];
  createdAt: string;
}

export interface CreateQuestionPayload {
  title: string;
  statement: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  options?: { text: string; isCorrect: boolean }[];
  codeTemplate?: string;
  testCases?: QuestionTestCase[];
  explanation?: string;
  visibility?: ContentVisibility;
}

export type AssessmentVisibility = 'OFFICIAL' | 'PRACTICE';

export interface AssessmentLevelThresholds {
  junior?: number;
  semisenior?: number;
  senior?: number;
}

export interface Assessment {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  visibility: AssessmentVisibility;
  levelThresholds: AssessmentLevelThresholds | null;
  timeLimitMinutes: number | null;
  createdAt: string;
  questions?: { questionId: string; position: number; question: Question }[];
}

export type InvitationStatus = 'PENDING' | 'STARTED' | 'COMPLETED' | 'EXPIRED';

// Track amplio del candidato invitado; la especialidad (Backend, Frontend,
// Cloud, Automation...) es texto libre a propósito, ver backend.
export type InvitationTrack = 'DEVELOPER' | 'QA' | 'OTHER';

export const INVITATION_TRACK_LABELS: Record<InvitationTrack, string> = {
  DEVELOPER: 'Desarrollo',
  QA: 'QA',
  OTHER: 'Otro',
};

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
  track: InvitationTrack | null;
  specialty: string | null;
  createdAt: string;
}

// Fila cruda parseada de un CSV (ver assessment-invite). El formato es más
// laxo que al crear una invitación individual: el email se valida recién en
// el servidor, fila por fila, para no tumbar todo el lote por un error de
// tipeo en una sola fila.
export interface BulkInvitationRow {
  candidateName?: string;
  candidateEmail?: string;
  track?: InvitationTrack;
  specialty?: string;
}

export interface BulkInvitationFailure {
  row: number;
  email?: string;
  error: string;
}

export interface BulkInvitationResult {
  created: Invitation[];
  failed: BulkInvitationFailure[];
}

export interface InvitationPublicView {
  status: InvitationStatus;
  assessmentId: string;
  assessmentName: string;
  assessmentDescription: string | null;
  candidateName: string | null;
  candidateEmail: string | null;
  attemptId: string | null;
}

export interface QuestionBank {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  visibility: ContentVisibility;
  questionCount: number;
  createdAt: string;
}

export interface QuestionBankDetail extends QuestionBank {
  items: Array<{ bankId: string; questionId: string; addedAt: string; question: Question }>;
}

// --- Candidatos (se registran solos para practicar; sistema separado del
// staff de organización, ver CandidateAuthService) ---

export interface CurrentCandidate {
  id: string;
  name: string;
  email: string;
}

export interface CandidateAuthResponse {
  accessToken: string;
  candidate: CurrentCandidate;
}

export interface PracticeCatalogEntry {
  id: string;
  name: string;
  description: string | null;
  timeLimitMinutes: number | null;
  questionCount: number;
  createdAt: string;
}

export interface PracticeAttemptSummary {
  id: string;
  assessmentId: string;
  assessmentName: string;
  // OFFICIAL solo aparece si el candidato estaba logueado al abrir una
  // invitación (ver InvitationsController.start) — normalmente todo acá es PRACTICE.
  assessmentVisibility: AssessmentVisibility;
  status: 'IN_PROGRESS' | 'COMPLETED';
  score: number | null;
  maxScore: number;
  level: 'JUNIOR' | 'SEMISENIOR' | 'SENIOR' | null;
  startedAt: string;
  finishedAt: string | null;
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
  // Lo que el candidato ya había respondido (si retoma el intento).
  selectedOptionId: string | null;
  submittedCode: string | null;
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
  // Momento en que el examen se corta automáticamente; null = sin límite.
  deadline: string | null;
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

// Insignia que un candidato colecciona al completar simulacros de práctica
// (nunca vía invitación oficial, que es anónima).
export interface Badge {
  code: string;
  icon: string;
  label: string;
  description: string;
}

export interface EarnedBadge extends Badge {
  earnedAt: string;
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
    explanation: string | null;
  }>;
  // Insignias otorgadas EN ESTA llamada a finish(); vacío en getResult() o
  // en un finish() repetido sobre un intento ya completado.
  newBadges: Badge[];
}

// --- Reportes de organización (individual por assessment y grupal/overview) ---

export interface CandidateReportRow {
  invitationId: string;
  candidateName: string | null;
  candidateEmail: string | null;
  status: InvitationStatus;
  score: number | null;
  maxScore: number | null;
  scorePercentage: number | null;
  level: 'JUNIOR' | 'SEMISENIOR' | 'SENIOR' | null;
  completedAt: string | null;
}

export interface QuestionStat {
  questionId: string;
  title: string;
  category: string;
  answered: number;
  correctRate: number;
}

export interface LevelDistributionEntry {
  level: 'JUNIOR' | 'SEMISENIOR' | 'SENIOR' | null;
  count: number;
}

export interface AssessmentReport {
  assessmentId: string;
  assessmentName: string;
  totalInvitations: number;
  completed: number;
  completionRate: number;
  averageScorePercentage: number | null;
  levelDistribution: LevelDistributionEntry[];
  questionStats: QuestionStat[];
  candidates: CandidateReportRow[];
}

export interface AssessmentOverviewEntry {
  assessmentId: string;
  assessmentName: string;
  totalInvitations: number;
  completed: number;
  completionRate: number;
  averageScorePercentage: number | null;
}

export interface CategoryOverviewEntry {
  category: string;
  answered: number;
  correctRate: number;
}

export interface OrganizationOverview {
  assessments: AssessmentOverviewEntry[];
  categoryBreakdown: CategoryOverviewEntry[];
}

export interface CandidateHistoryEntry {
  invitationId: string;
  assessmentId: string;
  assessmentName: string;
  year: number;
  track: InvitationTrack | null;
  specialty: string | null;
  status: InvitationStatus;
  score: number | null;
  maxScore: number | null;
  scorePercentage: number | null;
  level: 'JUNIOR' | 'SEMISENIOR' | 'SENIOR' | null;
  completedAt: string | null;
}

export interface CandidateHistoryGroup {
  email: string;
  name: string;
  entries: CandidateHistoryEntry[];
}
