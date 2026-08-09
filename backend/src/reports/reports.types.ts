import { InvitationStatus, InvitationTrack } from '../invitations/entities/invitation.entity';
import { CandidateLevel } from '../assessments/level.util';

export interface CandidateReportRow {
  invitationId: string;
  candidateName: string | null;
  candidateEmail: string | null;
  status: InvitationStatus;
  score: number | null;
  maxScore: number | null;
  scorePercentage: number | null;
  level: CandidateLevel | null;
  completedAt: string | null;
}

export interface QuestionStat {
  questionId: string;
  title: string;
  category: string;
  answered: number;
  correctRate: number; // 0-100
}

export interface LevelDistributionEntry {
  level: CandidateLevel | null; // null = completado pero sin nivel configurado/alcanzado
  count: number;
}

export interface AssessmentReport {
  assessmentId: string;
  assessmentName: string;
  totalInvitations: number;
  completed: number;
  completionRate: number; // 0-100
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
  correctRate: number; // 0-100
}

export interface OrganizationOverview {
  assessments: AssessmentOverviewEntry[];
  categoryBreakdown: CategoryOverviewEntry[];
}

// Una "candidatura": un intento de este candidato en un assessment oficial
// específico, con el año en que se lo invitó — la unidad mínima del
// historial multi-año (ver ReportsService.getCandidatesHistory).
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
  level: CandidateLevel | null;
  completedAt: string | null;
}

// Todas las candidaturas de UN candidato (identificado por correo) dentro
// de la organización, a través de assessments y años distintos.
export interface CandidateHistoryGroup {
  email: string;
  name: string; // el nombre más reciente informado
  entries: CandidateHistoryEntry[];
}
