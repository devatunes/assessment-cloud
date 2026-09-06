import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Question } from './question.entity';

// Opción de una pregunta de selección múltiple. isCorrect nunca se expone
// al candidato: los DTOs de attempts la eliminan antes de responder.
@Entity('question_option')
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => Question, (question) => question.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column()
  text: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean;

  @Column({ default: 0 })
  position: number;
}
