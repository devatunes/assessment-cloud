import { MigrationInterface, QueryRunner } from 'typeorm';

// Multi-tenant real: question/assessment quedan scoped a una organización.
// Crea una "Organización por defecto" y le asigna (backfill) todo lo ya
// sembrado por SeedQuestions1738800000001 ANTES de forzar NOT NULL, para no
// perder esa data. También agrega assessment.visibility (OFFICIAL/PRACTICE,
// para el catálogo público de simulacros) y assessment.level_thresholds
// (config opcional del evaluador para clasificar el resultado del candidato
// en JUNIOR/SEMISENIOR/SENIOR, ver AttemptsService).
export class AddOrganizationScopeToQuestionsAndAssessments1738800000003
  implements MigrationInterface
{
  name = 'AddOrganizationScopeToQuestionsAndAssessments1738800000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ id: defaultOrganizationId }] = await queryRunner.query(`
      INSERT INTO "organization" ("name") VALUES ('Organización por defecto')
      RETURNING id
    `);

    await queryRunner.query(`ALTER TABLE "question" ADD COLUMN "organization_id" uuid`);
    await queryRunner.query(
      `UPDATE "question" SET "organization_id" = $1`,
      [defaultOrganizationId],
    );
    await queryRunner.query(
      `ALTER TABLE "question" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "question" ADD CONSTRAINT "FK_question_organization"
        FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_question_organization" ON "question" ("organization_id")`,
    );

    await queryRunner.query(
      `CREATE TYPE "assessment_visibility_enum" AS ENUM ('OFFICIAL', 'PRACTICE')`,
    );
    await queryRunner.query(`ALTER TABLE "assessment" ADD COLUMN "organization_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "assessment" ADD COLUMN "visibility" "assessment_visibility_enum" NOT NULL DEFAULT 'OFFICIAL'`,
    );
    // Umbrales de score % mínimo para cada nivel, ej: {"junior":40,"semisenior":70,"senior":90}.
    // Nulo = el evaluador no configuró niveles para este assessment.
    await queryRunner.query(
      `ALTER TABLE "assessment" ADD COLUMN "level_thresholds" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "assessment" SET "organization_id" = $1`,
      [defaultOrganizationId],
    );
    await queryRunner.query(
      `ALTER TABLE "assessment" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "assessment" ADD CONSTRAINT "FK_assessment_organization"
        FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_assessment_organization" ON "assessment" ("organization_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assessment" DROP CONSTRAINT "FK_assessment_organization"`);
    await queryRunner.query(`ALTER TABLE "assessment" DROP COLUMN "organization_id"`);
    await queryRunner.query(`ALTER TABLE "assessment" DROP COLUMN "level_thresholds"`);
    await queryRunner.query(`ALTER TABLE "assessment" DROP COLUMN "visibility"`);
    await queryRunner.query(`DROP TYPE "assessment_visibility_enum"`);
    await queryRunner.query(`ALTER TABLE "question" DROP CONSTRAINT "FK_question_organization"`);
    await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "organization_id"`);
  }
}
