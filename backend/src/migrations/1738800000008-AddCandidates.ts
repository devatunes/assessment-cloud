import { MigrationInterface, QueryRunner } from 'typeorm';

// Candidatos que se registran solos para practicar (sistema de cuentas
// completamente separado del staff de organización, ver src/candidates/ y
// src/candidate-auth/). "attempt.candidate_id" solo se estampa en intentos
// de simulacro iniciados por un candidato logueado — los oficiales vía
// invitación siguen siendo anónimos (no cambia).
export class AddCandidates1738800000008 implements MigrationInterface {
  name = 'AddCandidates1738800000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "candidate" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "password_hash" varchar NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_candidate" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_candidate_email" ON "candidate" (LOWER("email"))
    `);

    await queryRunner.query(`ALTER TABLE "attempt" ADD COLUMN "candidate_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "attempt" ADD CONSTRAINT "FK_attempt_candidate"
        FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX "IDX_attempt_candidate" ON "attempt" ("candidate_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "attempt" DROP CONSTRAINT "FK_attempt_candidate"`);
    await queryRunner.query(`ALTER TABLE "attempt" DROP COLUMN "candidate_id"`);
    await queryRunner.query(`DROP TABLE "candidate"`);
  }
}
