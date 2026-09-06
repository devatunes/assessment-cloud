import { MigrationInterface, QueryRunner } from 'typeorm';

// Clasificación del candidato invitado (a qué tipo de puesto se está
// evaluando): un track amplio y cerrado (DEVELOPER/QA/OTHER) + una
// especialidad libre dentro de ese track (Backend, Frontend, Cloud,
// Automation, etc.) — no se cierra la especialidad en un enum porque el
// usuario explícitamente no quiere quedar atado a una lista fija ("Tester y
// sus diferentes facciones"). Ambos son editables después de crear la
// invitación (ver InvitationsService.updateClassification), y junto con el
// correo del candidato (ya existente) permiten armar su historial a través
// de años/assessments distintos (ver ReportsService.getCandidatesHistory).
export class AddInvitationTrackAndSpecialty1738800000010 implements MigrationInterface {
  name = 'AddInvitationTrackAndSpecialty1738800000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "invitation_track_enum" AS ENUM ('DEVELOPER', 'QA', 'OTHER')
    `);
    await queryRunner.query(`
      ALTER TABLE "invitation" ADD COLUMN "track" "invitation_track_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "invitation" ADD COLUMN "specialty" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invitation" DROP COLUMN "specialty"`);
    await queryRunner.query(`ALTER TABLE "invitation" DROP COLUMN "track"`);
    await queryRunner.query(`DROP TYPE "invitation_track_enum"`);
  }
}
