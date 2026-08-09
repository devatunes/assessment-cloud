import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum InvitationStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

// Track amplio del candidato invitado (a qué tipo de puesto se evalúa). La
// especialidad dentro del track (Backend, Frontend, Cloud, Automation...) es
// texto libre a propósito, ver la migración que agrega estas columnas.
export enum InvitationTrack {
  DEVELOPER = 'DEVELOPER',
  QA = 'QA',
  OTHER = 'OTHER',
}

@Entity('invitation')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Denormalizado desde assessment.organizationId: permite scoping directo
  // sin join extra en listados/guards.
  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'assessment_id' })
  assessmentId: string;

  @Column({ name: 'candidate_name', type: 'varchar', nullable: true })
  candidateName: string | null;

  @Column({ name: 'candidate_email', type: 'varchar', nullable: true })
  candidateEmail: string | null;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Column({ name: 'attempt_id', type: 'uuid', nullable: true })
  attemptId: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'created_by_user_id' })
  createdByUserId: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'enum', enum: InvitationTrack, nullable: true })
  track: InvitationTrack | null;

  @Column({ type: 'varchar', nullable: true })
  specialty: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
