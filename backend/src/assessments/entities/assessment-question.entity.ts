import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Question } from '../../questions/entities/question.entity';
import { Assessment } from './assessment.entity';

// Relación M:N explícita entre assessment y question, con orden (position).
@Entity('assessment_question')
export class AssessmentQuestion {
  @PrimaryColumn({ name: 'assessment_id' })
  assessmentId: string;

  @PrimaryColumn({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => Assessment, (assessment) => assessment.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assessment_id' })
  assessment: Assessment;

  @ManyToOne(() => Question, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ default: 0 })
  position: number;
}
