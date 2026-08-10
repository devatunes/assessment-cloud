import { randomBytes } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isEmail } from 'class-validator';
import { Repository } from 'typeorm';
import { Invitation, InvitationStatus } from './entities/invitation.entity';
import { Assessment, AssessmentVisibility } from '../assessments/entities/assessment.entity';
import { AttemptsService } from '../attempts/attempts.service';
import { AttemptWithQuestions } from '../attempts/attempts.types';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { BulkInvitationRowDto } from './dto/bulk-create-invitations.dto';
import { UpdateInvitationClassificationDto } from './dto/update-invitation-classification.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PaginatedResult, paginate } from '../common/paginated-result';

export type BulkInvitationFailure = { row: number; email?: string; error: string };
export type BulkInvitationResult = { created: Invitation[]; failed: BulkInvitationFailure[] };

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    private readonly attemptsService: AttemptsService,
  ) {}

  async createForAssessment(
    organizationId: string,
    createdByUserId: string,
    assessmentId: string,
    dto: CreateInvitationDto,
  ): Promise<Invitation> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId, organizationId },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} no encontrado`);
    }
    if (assessment.visibility !== AssessmentVisibility.OFFICIAL) {
      throw new BadRequestException(
        'Solo los assessments oficiales admiten invitaciones (los simulacros son de acceso libre)',
      );
    }

    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    return this.invitationRepository.save(
      this.invitationRepository.create({
        organizationId,
        assessmentId,
        candidateName: dto.candidateName ?? null,
        candidateEmail: dto.candidateEmail ?? null,
        token: randomBytes(32).toString('hex'),
        createdByUserId,
        expiresAt,
        track: dto.track ?? null,
        specialty: dto.specialty ?? null,
      }),
    );
  }

  // Importación masiva (CSV parseado en el frontend). A diferencia de
  // CreateInvitationDto, BulkInvitationRowDto no exige @IsEmail: si lo
  // hiciera, el ValidationPipe rechazaría el body ENTERO por una sola fila
  // mal escrita antes de llegar acá. En cambio se valida el email a mano
  // por fila (misma lógica que el decorador, vía isEmail() de
  // class-validator) y se reporta esa fila como fallo sin tumbar las demás.
  async createManyForAssessment(
    organizationId: string,
    createdByUserId: string,
    assessmentId: string,
    rows: BulkInvitationRowDto[],
  ): Promise<BulkInvitationResult> {
    const created: Invitation[] = [];
    const failed: BulkInvitationFailure[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (row.candidateEmail && !isEmail(row.candidateEmail)) {
        failed.push({ row: i + 1, email: row.candidateEmail, error: 'Correo inválido' });
        continue;
      }

      try {
        const dto: CreateInvitationDto = {
          candidateName: row.candidateName,
          candidateEmail: row.candidateEmail,
          track: row.track,
          specialty: row.specialty,
        };
        created.push(
          await this.createForAssessment(organizationId, createdByUserId, assessmentId, dto),
        );
      } catch (error) {
        failed.push({
          row: i + 1,
          email: row.candidateEmail,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    return { created, failed };
  }

  // El track/especialidad puede reasignarse después de creada la invitación
  // (ej: el reclutador se equivocó, o decide reclasificar al candidato para
  // el historial de este año) — a diferencia del resto de la invitación, que
  // no se edita una vez generada.
  async updateClassification(
    organizationId: string,
    invitationId: string,
    dto: UpdateInvitationClassificationDto,
  ): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, organizationId },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitación ${invitationId} no encontrada`);
    }

    if (dto.track !== undefined) invitation.track = dto.track;
    if (dto.specialty !== undefined) invitation.specialty = dto.specialty;

    return this.invitationRepository.save(invitation);
  }

  async listForAssessment(
    organizationId: string,
    assessmentId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Invitation>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await this.invitationRepository.findAndCount({
      where: { organizationId, assessmentId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return paginate(items, total, page, pageSize);
  }

  // Lectura pública (landing del candidato invitado). Aplica el flip
  // perezoso PENDING -> EXPIRED (sin cron/EventBridge): se evalúa en cada
  // lectura/uso del token.
  async findByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({ where: { token } });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (
      invitation.status === InvitationStatus.PENDING &&
      invitation.expiresAt &&
      invitation.expiresAt < new Date()
    ) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
    }

    return invitation;
  }

  // Vista pública para la landing del candidato: nunca expone
  // organizationId/createdByUserId, sí el nombre del assessment para que
  // sepa qué está a punto de resolver.
  async getPublicView(token: string) {
    const invitation = await this.findByToken(token);
    const assessment = await this.assessmentRepository.findOne({
      where: { id: invitation.assessmentId },
    });

    return {
      status: invitation.status,
      assessmentId: invitation.assessmentId,
      assessmentName: assessment?.name ?? '',
      assessmentDescription: assessment?.description ?? null,
      candidateName: invitation.candidateName,
      candidateEmail: invitation.candidateEmail,
      attemptId: invitation.attemptId,
    };
  }

  // Inicia el attempt la primera vez; si el candidato ya empezó o terminó,
  // RETOMA el mismo attempt en vez de crear uno nuevo (mismo espíritu de
  // idempotencia que AttemptsService.getResult). candidateId es opcional: si
  // viene (candidato logueado con su cuenta de práctica), el intento oficial
  // queda vinculado a su historial además de contar en el reporte de la
  // organización — ambas cosas conviven sin conflicto (ver AttemptsService.create).
  async startOrResume(
    token: string,
    candidateName: string,
    candidateId?: string,
  ): Promise<AttemptWithQuestions> {
    const invitation = await this.findByToken(token);

    if (invitation.status === InvitationStatus.EXPIRED) {
      throw new BadRequestException('Esta invitación expiró');
    }

    if (invitation.status === InvitationStatus.STARTED || invitation.status === InvitationStatus.COMPLETED) {
      return this.attemptsService.findOne(invitation.attemptId!);
    }

    const attempt = await this.attemptsService.create(
      {
        assessmentId: invitation.assessmentId,
        candidateName,
        candidateEmail: invitation.candidateEmail ?? undefined,
      },
      candidateId,
    );

    invitation.attemptId = attempt.id;
    invitation.candidateName = candidateName;
    invitation.status = InvitationStatus.STARTED;
    invitation.startedAt = new Date();
    await this.invitationRepository.save(invitation);

    return attempt;
  }
}
