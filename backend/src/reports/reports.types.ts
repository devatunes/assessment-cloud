import { InvitationStatus } from '../invitations/entities/invitation.entity';
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
