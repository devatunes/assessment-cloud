import { randomBytes } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation, InvitationStatus } from './entities/invitation.entity';
import { Assessment, AssessmentVisibility } from '../assessments/entities/assessment.entity';
import { AttemptsService } from '../attempts/attempts.service';
import { AttemptWithQuestions } from '../attempts/attempts.types';
import { CreateInvitationDto } from './dto/create-invitation.dto';

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
      }),
    );
  }

  async listForAssessment(organizationId: string, assessmentId: string): Promise<Invitation[]> {
    return this.invitationRepository.find({
      where: { organizationId, assessmentId },
      order: { createdAt: 'DESC' },
    });
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
      attemptId: invitation.attemptId,
    };
  }

  // Inicia el attempt la primera vez; si el candidato ya empezó o terminó,
  // RETOMA el mismo attempt en vez de crear uno nuevo (mismo espíritu de
  // idempotencia que AttemptsService.getResult).
  async startOrResume(token: string, candidateName: string): Promise<AttemptWithQuestions> {
    const invitation = await this.findByToken(token);

    if (invitation.status === InvitationStatus.EXPIRED) {
      throw new BadRequestException('Esta invitación expiró');
    }

    if (invitation.status === InvitationStatus.STARTED || invitation.status === InvitationStatus.COMPLETED) {
      return this.attemptsService.findOne(invitation.attemptId!);
    }

    const attempt = await this.attemptsService.create({
      assessmentId: invitation.assessmentId,
      candidateName,
      candidateEmail: invitation.candidateEmail ?? undefined,
    });

    invitation.attemptId = attempt.id;
    invitation.candidateName = candidateName;
    invitation.status = InvitationStatus.STARTED;
    invitation.startedAt = new Date();
    await this.invitationRepository.save(invitation);

    return attempt;
  }
}
