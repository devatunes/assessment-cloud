import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Una fila por insignia obtenida (única por candidato+código, ver migración).
@Entity('candidate_badge')
@Unique(['candidateId', 'badgeCode'])
export class CandidateBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'candidate_id' })
  candidateId: string;

  @Column({ name: 'badge_code' })
  badgeCode: string;

  @Column({ name: 'source_attempt_id', type: 'uuid', nullable: true })
  sourceAttemptId: string | null;

  @CreateDateColumn({ name: 'earned_at' })
  earnedAt: Date;
}
