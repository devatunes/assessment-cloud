import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { QuestionBank } from './question-bank.entity';
import { Question } from '../../questions/entities/question.entity';

// M:N entre banco y pregunta: una pregunta puede vivir en varios bancos a
// la vez (a diferencia de category/difficulty, que son atributos propios
// de cada pregunta individual y no cambian con esto).
@Entity('question_bank_item')
export class QuestionBankItem {
  @PrimaryColumn({ name: 'bank_id' })
  bankId: string;

  @PrimaryColumn({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => QuestionBank, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bank_id' })
  bank: QuestionBank;

  @ManyToOne(() => Question, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
