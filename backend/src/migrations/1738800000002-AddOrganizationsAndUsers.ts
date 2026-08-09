import { MigrationInterface, QueryRunner } from 'typeorm';

// Cuentas de organización (staff que recluta): Organization + User.
// "app_user" (no "user"): evita el rol/nombre reservado de Postgres.
export class AddOrganizationsAndUsers1738800000002 implements MigrationInterface {
  name = 'AddOrganizationsAndUsers1738800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('ADMIN', 'RECRUITER')
    `);
    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE')
    `);

    await queryRunner.query(`
      CREATE TABLE "organization" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "app_user" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "password_hash" varchar,
        "role" "user_role_enum" NOT NULL DEFAULT 'RECRUITER',
        "status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "activation_token" varchar,
        "activation_token_expires_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_user" PRIMARY KEY ("id"),
        CONSTRAINT "FK_app_user_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organization"("id") ON DELETE CASCADE
      )
    `);

    // Email único global: el login es solo email+password sin selector de
    // organización (ver justificación en el plan de la kata v2).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_app_user_email" ON "app_user" (LOWER("email"))
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_app_user_activation_token" ON "app_user" ("activation_token")
      WHERE "activation_token" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_user"`);
    await queryRunner.query(`DROP TABLE "organization"`);
    await queryRunner.query(`DROP TYPE "user_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
