import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { BulkCreateInvitationsDto } from './dto/bulk-create-invitations.dto';
import { UpdateInvitationClassificationDto } from './dto/update-invitation-classification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth-user.interface';

// Lado reclutador: crear/listar invitaciones de un assessment propio.
@ApiTags('invitations')
@ApiBearerAuth()
@Controller('assessments/:assessmentId/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Genera un link de invitación para un candidato' })
  create(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.createForAssessment(
      user.organizationId,
      user.userId,
      assessmentId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lista las invitaciones de un assessment con su estado' })
  list(@Param('assessmentId') assessmentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invitationsService.listForAssessment(user.organizationId, assessmentId);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Genera invitaciones para varios candidatos a la vez (importación CSV)' })
  createBulk(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: BulkCreateInvitationsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.createManyForAssessment(
      user.organizationId,
      user.userId,
      assessmentId,
      dto.invitations,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza el track/especialidad del candidato (editable en cualquier momento)' })
  updateClassification(
    @Param('id') id: string,
    @Body() dto: UpdateInvitationClassificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.updateClassification(user.organizationId, id, dto);
  }
}
