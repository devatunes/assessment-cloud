import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Compartido con Question (misma columna/tipo Postgres "content_visibility_enum",
// creado en la migración de question_bank y reutilizado por la de question).
export enum ContentVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

@Entity('question_bank')
export class QuestionBank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  // PRIVATE (default): solo la organización dueña lo ve/usa. PUBLIC: todas
  // las organizaciones pueden ver y usar sus preguntas (solo lectura, ver
  // QuestionBanksService) en sus propios assessments/simulacros.
  @Column({ type: 'enum', enum: ContentVisibility, default: ContentVisibility.PRIVATE })
  visibility: ContentVisibility;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
