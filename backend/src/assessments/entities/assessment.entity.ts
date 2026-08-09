import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssessmentQuestion } from './assessment-question.entity';

export enum AssessmentVisibility {
  // Requiere invitación (link con token) para que un candidato lo resuelva.
  OFFICIAL = 'OFFICIAL',
  // Simulacro: visible en el catálogo público para cualquier candidato
  // registrado, sin invitación (ver src/practice/).
  PRACTICE = 'PRACTICE',
}

// Score % mínimo (0-100) para alcanzar cada nivel. Ej: {junior:40,
// semisenior:70, senior:90} — un score de 75% cae en SEMISENIOR. Todos
// opcionales: el evaluador puede configurar solo los niveles que le
// interesen, o ninguno (sin nivel calculado para ese assessment).
export type AssessmentLevelThresholds = {
  junior?: number;
  semisenior?: number;
  senior?: number;
};

@Entity('assessment')
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: AssessmentVisibility, default: AssessmentVisibility.OFFICIAL })
  visibility: AssessmentVisibility;

  @Column('jsonb', { name: 'level_thresholds', nullable: true })
  levelThresholds: AssessmentLevelThresholds | null;

  @OneToMany(() => AssessmentQuestion, (aq) => aq.assessment, {
    cascade: true,
  })
  questions: AssessmentQuestion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
