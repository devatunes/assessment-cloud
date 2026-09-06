import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('attempt_feedback')
export class AttemptFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attempt_id', unique: true })
  attemptId: string;

  @Column('int')
  rating: number;

  @Column('text', { nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
