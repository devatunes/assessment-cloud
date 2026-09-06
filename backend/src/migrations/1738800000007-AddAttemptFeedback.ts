import { MigrationInterface, QueryRunner } from 'typeorm';

// Encuesta breve al candidato al terminar su intento (rating 1-5 +
// comentario opcional) — para que la organización sepa qué tal fue la
// experiencia con la plataforma, no con el contenido del assessment.
export class AddAttemptFeedback1738800000007 implements MigrationInterface {
  name = 'AddAttemptFeedback1738800000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attempt_feedback" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "attempt_id" uuid NOT NULL,
        "rating" int NOT NULL,
        "comment" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attempt_feedback" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attempt_feedback_attempt" UNIQUE ("attempt_id"),
        CONSTRAINT "CHK_attempt_feedback_rating" CHECK ("rating" BETWEEN 1 AND 5),
        CONSTRAINT "FK_attempt_feedback_attempt" FOREIGN KEY ("attempt_id")
          REFERENCES "attempt"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attempt_feedback"`);
  }
}
