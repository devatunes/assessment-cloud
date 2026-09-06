import { MigrationInterface, QueryRunner } from 'typeorm';

// Completa candidate_email/candidate_name en invitaciones que se generaron
// sin correo pero cuyo intento quedó vinculado a una cuenta de candidato
// (candidateId) — antes de este fix, esos casos nunca entraban al reporte
// de candidatos de la organización porque se agrupa por correo.
export class BackfillInvitationCandidateEmail1738800000011 implements MigrationInterface {
  name = 'BackfillInvitationCandidateEmail1738800000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "invitation" i
      SET "candidate_email" = c."email",
          "candidate_name" = COALESCE(i."candidate_name", c."name")
      FROM "attempt" a
      JOIN "candidate" c ON c."id" = a."candidate_id"
      WHERE i."attempt_id" = a."id"
        AND i."candidate_email" IS NULL
        AND a."candidate_id" IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // Backfill de datos, no de esquema: no se revierte (no hay forma de
    // distinguir qué filas tenían el correo real antes de esta migración).
  }
}
