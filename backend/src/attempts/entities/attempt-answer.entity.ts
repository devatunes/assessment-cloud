import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Question } from '../../questions/entities/question.entity';
import { Attempt } from './attempt.entity';

// Resultado del último Run de código del candidato (casos visibles).
export type CodeRunResult = {
  results: Array<{
    input: unknown;
    expected: string;
    actual: string;
    stderr: string;
    timedOut: boolean;
    passed: boolean;
  }>;
  allPassed: boolean;
};

// Respuesta del candidato a una pregunta dentro de un intento.
@Entity('attempt_answer')
@Unique(['attemptId', 'questionId'])
export class AttemptAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attempt_id' })
  attemptId: string;

  @ManyToOne(() => Attempt, (attempt) => attempt.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attempt_id' })
  attempt: Attempt;

  @Column({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  // Selección múltiple: opción elegida
  @Column({ name: 'selected_option_id', type: 'uuid', nullable: true })
  selectedOptionId: string | null;

  // Código: último código enviado y resultado del último Run
  @Column('text', { name: 'submitted_code', nullable: true })
  submittedCode: string | null;

  @Column('jsonb', { name: 'last_run_result', nullable: true })
  lastRunResult: CodeRunResult | null;

  // Calculados por el scoring al finalizar el intento
  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect: boolean | null;

  @Column({ type: 'int', default: 0 })
  points: number;
}
