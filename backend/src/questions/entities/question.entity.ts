import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionOption } from './question-option.entity';
import { ContentVisibility } from '../../question-banks/entities/question-bank.entity';

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  CODE = 'CODE',
}

// Lista cerrada por rol (antes era texto libre: "javascript"/"JS"/"Java
// Script" desordenaban la biblioteca). Ver migración 006.
export enum QuestionCategory {
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  FULLSTACK = 'FULLSTACK',
  DEVOPS = 'DEVOPS',
  QA = 'QA',
  DATA = 'DATA',
  MOBILE = 'MOBILE',
  OTHER = 'OTHER',
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

  @Column({ type: 'enum', enum: QuestionCategory })
  category: QuestionCategory;

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

  // Por qué la respuesta correcta es correcta (y las demás no) — se muestra
  // al candidato en el resultado final, después de finalizar el intento.
  @Column('text', { nullable: true })
  explanation: string | null;

  // PRIVATE (default): solo la organización dueña la ve/usa. PUBLIC: visible
  // para cualquier organización, que solo puede usarla de solo lectura (para
  // editarla debe "Copiar a mi biblioteca" primero, ver QuestionsService).
  @Column({ type: 'enum', enum: ContentVisibility, default: ContentVisibility.PRIVATE })
  visibility: ContentVisibility;

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
