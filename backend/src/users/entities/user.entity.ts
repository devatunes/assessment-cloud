import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER',
}

export enum UserStatus {
  PENDING_ACTIVATION = 'PENDING_ACTIVATION',
  ACTIVE = 'ACTIVE',
}

// Tabla "app_user" (no "user": choca con el rol reservado de Postgres).
// Staff de una organización que recluta — separado por completo del sistema
// de cuentas de Candidate (ver src/candidates/).
@Entity('app_user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  // Nulo mientras status=PENDING_ACTIVATION (invitado, aún sin fijar contraseña).
  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.RECRUITER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'activation_token', type: 'varchar', nullable: true })
  activationToken: string | null;

  @Column({ name: 'activation_token_expires_at', type: 'timestamptz', nullable: true })
  activationTokenExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
