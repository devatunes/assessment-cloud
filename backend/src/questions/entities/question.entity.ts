import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionOption } from './question-option.entity';

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  CODE = 'CODE',
}

// Test case de una pregunta de código. Los "hidden" solo se usan en el
// scoring del servidor: nunca viajan al candidato.
export type QuestionTestCase = {
  input: unknown;
  expectedOutput: string;
  hidden: boolean;
};

@Entity('question')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Solo columna (sin @ManyToOne): nada navega esta relación, y así se evita
  // un eager-load innecesario. Todo query la usa como filtro explícito de
  // tenant — ver QuestionsService.
  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  title: string;

  @Column('text')
  statement: string;

  @Column()
  category: string;

  @Column({ type: 'enum', enum: QuestionDifficulty })
  difficulty: QuestionDifficulty;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  // Solo preguntas CODE: esqueleto inicial del editor
  @Column('text', { name: 'code_template', nullable: true })
  codeTemplate: string | null;

  // Solo preguntas CODE: casos de prueba (visibles + ocultos)
  @Column('jsonb', { name: 'test_cases', nullable: true })
  testCases: QuestionTestCase[] | null;

  // Nota: NO se usa orphanedRowAction para borrar opciones reemplazadas —
  // requiere que la FK sea nullable (TypeORM intenta poner NULL antes de
  // borrar) y question_id es NOT NULL. QuestionsService.update() borra las
  // opciones anteriores explícitamente antes de insertar las nuevas.
  @OneToMany(() => QuestionOption, (option) => option.question, {
    cascade: true,
  })
  options: QuestionOption[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
