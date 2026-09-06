import { MigrationInterface, QueryRunner } from 'typeorm';

// Bancos de preguntas: colección con nombre/descripción propia que agrupa
// preguntas (M:N — una pregunta puede vivir en varios bancos a la vez, a
// diferencia de category/difficulty que son atributos propios e
// individuales de cada pregunta y no cambian con esto).
export class AddQuestionBanks1738800000005 implements MigrationInterface {
  name = 'AddQuestionBanks1738800000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "content_visibility_enum" AS ENUM ('PRIVATE', 'PUBLIC')`,
    );

    await queryRunner.query(`
      CREATE TABLE "question_bank" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "description" text,
        "visibility" "content_visibility_enum" NOT NULL DEFAULT 'PRIVATE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_question_bank" PRIMARY KEY ("id"),
        CONSTRAINT "FK_question_bank_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organization"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_question_bank_organization" ON "question_bank" ("organization_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "question_bank_item" (
        "bank_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "added_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_question_bank_item" PRIMARY KEY ("bank_id", "question_id"),
        CONSTRAINT "FK_qbi_bank" FOREIGN KEY ("bank_id")
          REFERENCES "question_bank"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_qbi_question" FOREIGN KEY ("question_id")
          REFERENCES "question"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "question_bank_item"`);
    await queryRunner.query(`DROP TABLE "question_bank"`);
    await queryRunner.query(`DROP TYPE "content_visibility_enum"`);
  }
}
