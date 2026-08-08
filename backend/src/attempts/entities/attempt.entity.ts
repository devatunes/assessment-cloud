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
