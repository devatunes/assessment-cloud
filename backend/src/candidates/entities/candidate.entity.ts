import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Cuenta de un candidato que se registra por su cuenta para practicar
// (simulacros públicos) — sistema completamente separado del staff de
// organización (ver src/users/). Nunca ve nada de administración de una
// empresa.
@Entity('candidate')
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
