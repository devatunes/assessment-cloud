import { MigrationInterface, QueryRunner } from 'typeorm';

// Insignias que un candidato colecciona al completar simulacros de práctica
// (nunca vía invitación oficial, que es anónima — ver attempt.candidate_id).
// "badge_code" es varchar (no un enum de Postgres): el catálogo de insignias
// vive en código (ver badges/badge-catalog.ts) y así se puede extender sin
// migraciones nuevas.
export class AddCandidateBadges1738800000009 implements MigrationInterface {
  name = 'AddCandidateBadges1738800000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "candidate_badge" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "candidate_id" uuid NOT NULL,
        "badge_code" varchar NOT NULL,
        "source_attempt_id" uuid,
        "earned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_candidate_badge" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_candidate_badge_code" UNIQUE ("candidate_id", "badge_code"),
        CONSTRAINT "FK_candidate_badge_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidate"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_candidate_badge_attempt" FOREIGN KEY ("source_attempt_id")
          REFERENCES "attempt"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_candidate_badge_candidate" ON "candidate_badge" ("candidate_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "candidate_badge"`);
  }
}
