import { MigrationInterface, QueryRunner } from 'typeorm';

// Esquema inicial: preguntas, opciones, assessments, intentos y respuestas.
export class InitSchema1738800000000 implements MigrationInterface {
  name = 'InitSchema1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "question_difficulty_enum" AS ENUM ('EASY', 'MEDIUM', 'HARD')
    `);
    await queryRunner.query(`
      CREATE TYPE "question_type_enum" AS ENUM ('MULTIPLE_CHOICE', 'CODE')
    `);
    await queryRunner.query(`
      CREATE TYPE "attempt_status_enum" AS ENUM ('IN_PROGRESS', 'COMPLETED')
    `);

    await queryRunner.query(`
      CREATE TABLE "question" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar NOT NULL,
        "statement" text NOT NULL,
        "category" varchar NOT NULL,
        "difficulty" "question_difficulty_enum" NOT NULL,
        "type" "question_type_enum" NOT NULL,
        "code_template" text,
        "test_cases" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_question" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "question_option" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL,
        "text" varchar NOT NULL,
        "is_correct" boolean NOT NULL DEFAULT false,
        "position" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_question_option" PRIMARY KEY ("id"),
        CONSTRAINT "FK_question_option_question" FOREIGN KEY ("question_id")
          REFERENCES "question"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assessment" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "description" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assessment" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assessment_question" (
        "assessment_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "position" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_assessment_question" PRIMARY KEY ("assessment_id", "question_id"),
        CONSTRAINT "FK_aq_assessment" FOREIGN KEY ("assessment_id")
          REFERENCES "assessment"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_aq_question" FOREIGN KEY ("question_id")
          REFERENCES "question"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "attempt" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "assessment_id" uuid NOT NULL,
        "candidate_name" varchar NOT NULL,
        "candidate_email" varchar,
        "status" "attempt_status_enum" NOT NULL DEFAULT 'IN_PROGRESS',
        "score" int,
        "max_score" int NOT NULL DEFAULT 0,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "finished_at" TIMESTAMPTZ,
        CONSTRAINT "PK_attempt" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attempt_assessment" FOREIGN KEY ("assessment_id")
          REFERENCES "assessment"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "attempt_answer" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "attempt_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "selected_option_id" uuid,
        "submitted_code" text,
        "last_run_result" jsonb,
        "is_correct" boolean,
        "points" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_attempt_answer" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attempt_answer_attempt_question" UNIQUE ("attempt_id", "question_id"),
        CONSTRAINT "FK_answer_attempt" FOREIGN KEY ("attempt_id")
          REFERENCES "attempt"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_answer_question" FOREIGN KEY ("question_id")
          REFERENCES "question"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attempt_answer"`);
    await queryRunner.query(`DROP TABLE "attempt"`);
    await queryRunner.query(`DROP TABLE "assessment_question"`);
    await queryRunner.query(`DROP TABLE "assessment"`);
    await queryRunner.query(`DROP TABLE "question_option"`);
    await queryRunner.query(`DROP TABLE "question"`);
    await queryRunner.query(`DROP TYPE "attempt_status_enum"`);
    await queryRunner.query(`DROP TYPE "question_type_enum"`);
    await queryRunner.query(`DROP TYPE "question_difficulty_enum"`);
  }
}
