import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Assessment } from '../../assessments/entities/assessment.entity';
import { AttemptAnswer } from './attempt-answer.entity';

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

// Intento de un candidato sobre un assessment.
@Entity('attempt')
export class Attempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assessment_id' })
  assessmentId: string;

  @ManyToOne(() => Assessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessment_id' })
  assessment: Assessment;

  @Column({ name: 'candidate_name' })
  candidateName: string;

  @Column({ name: 'candidate_email', type: 'varchar', nullable: true })
  candidateEmail: string | null;

  // Solo se estampa en intentos de PRÁCTICA iniciados por un candidato
  // logueado (ver PracticeService.start) — los oficiales vía invitación
  // siguen siendo 100% anónimos. Esto es lo que hace que el historial del
  // candidato (PracticeService.myAttempts) y el reporte de una organización
  // nunca se mezclen: cada uno filtra por un criterio distinto y mutuamente
  // excluyente.
  @Column({ name: 'candidate_id', type: 'uuid', nullable: true })
  candidateId: string | null;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ name: 'max_score', type: 'int', default: 0 })
  maxScore: number;

  @OneToMany(() => AttemptAnswer, (answer) => answer.attempt, {
    cascade: true,
  })
  answers: AttemptAnswer[];

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}
