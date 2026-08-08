import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssessmentQuestion } from './assessment-question.entity';

@Entity('assessment')
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @OneToMany(() => AssessmentQuestion, (aq) => aq.assessment, {
    cascade: true,
  })
  questions: AssessmentQuestion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
