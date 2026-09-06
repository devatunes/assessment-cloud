import { MigrationInterface, QueryRunner } from 'typeorm';

// - question.category pasa de texto libre a una lista cerrada por rol
//   (evita "javascript"/"JS"/"Java Script" desordenando la biblioteca).
// - question.visibility (PRIVATE/PUBLIC): cada organización puede compartir
//   preguntas sueltas al catálogo público, además de bancos completos (ver
//   question_bank.visibility en la migración anterior, mismo enum
//   "content_visibility_enum" reutilizado acá).
// - question.explanation: por qué la respuesta correcta es correcta (y las
//   demás no), mostrado al candidato en el resultado final.
// - assessment.time_limit_minutes: duración configurable del examen (nulo
//   = sin límite), reforzada también del lado del servidor en AttemptsService.
export class StructureQuestionCategoryAndSharing1738800000006 implements MigrationInterface {
  name = 'StructureQuestionCategoryAndSharing1738800000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "question_category_enum" AS ENUM
        ('BACKEND', 'FRONTEND', 'FULLSTACK', 'DEVOPS', 'QA', 'DATA', 'MOBILE', 'OTHER')
    `);

    // Convierte la data ya sembrada (texto libre) a la lista cerrada; lo no
    // reconocido cae en OTHER en vez de fallar la migración.
    await queryRunner.query(`
      ALTER TABLE "question"
      ALTER COLUMN "category" TYPE "question_category_enum"
      USING (
        CASE LOWER("category")
          WHEN 'javascript' THEN 'FULLSTACK'
          WHEN 'algorithms' THEN 'BACKEND'
          WHEN 'sql' THEN 'BACKEND'
          WHEN 'cloud' THEN 'DEVOPS'
          ELSE 'OTHER'
        END
      )::"question_category_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "question"
      ADD COLUMN "visibility" "content_visibility_enum" NOT NULL DEFAULT 'PRIVATE'
    `);
    await queryRunner.query(`ALTER TABLE "question" ADD COLUMN "explanation" text`);

    await queryRunner.query(
      `ALTER TABLE "assessment" ADD COLUMN "time_limit_minutes" int`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assessment" DROP COLUMN "time_limit_minutes"`);
    await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "explanation"`);
    await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "visibility"`);
    await queryRunner.query(`ALTER TABLE "question" ALTER COLUMN "category" TYPE varchar`);
    await queryRunner.query(`DROP TYPE "question_category_enum"`);
  }
}
