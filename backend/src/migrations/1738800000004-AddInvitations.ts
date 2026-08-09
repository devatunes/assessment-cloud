import { MigrationInterface, QueryRunner } from 'typeorm';

// Invitaciones de candidatos a assessments oficiales: link con token único,
// sin envío de email real (el reclutador lo copia/envía manualmente). El
// estado EXPIRED se calcula perezosamente en la app (ver InvitationsService),
// no hay cron/EventBridge.
export class AddInvitations1738800000004 implements MigrationInterface {
  name = 'AddInvitations1738800000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "invitation_status_enum" AS ENUM ('PENDING', 'STARTED', 'COMPLETED', 'EXPIRED')
    `);

    await queryRunner.query(`
      CREATE TABLE "invitation" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "assessment_id" uuid NOT NULL,
        "candidate_name" varchar,
        "candidate_email" varchar,
        "token" varchar NOT NULL,
        "status" "invitation_status_enum" NOT NULL DEFAULT 'PENDING',
        "attempt_id" uuid,
        "expires_at" TIMESTAMPTZ,
        "created_by_user_id" uuid NOT NULL,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitation" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invitation_token" UNIQUE ("token"),
        CONSTRAINT "UQ_invitation_attempt" UNIQUE ("attempt_id"),
        CONSTRAINT "FK_invitation_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organization"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invitation_assessment" FOREIGN KEY ("assessment_id")
          REFERENCES "assessment"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invitation_attempt" FOREIGN KEY ("attempt_id")
          REFERENCES "attempt"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_invitation_created_by" FOREIGN KEY ("created_by_user_id")
          REFERENCES "app_user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_invitation_assessment" ON "invitation" ("assessment_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invitation_organization" ON "invitation" ("organization_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "invitation"`);
    await queryRunner.query(`DROP TYPE "invitation_status_enum"`);
  }
}
