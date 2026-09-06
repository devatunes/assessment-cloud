import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { StartInvitationDto } from './dto/start-invitation.dto';
import { OptionalCandidateAuthGuard } from '../candidate-auth/optional-candidate-auth.guard';
import { OptionalCandidate } from '../candidate-auth/optional-candidate.decorator';
import { AuthenticatedCandidate } from '../candidate-auth/candidate-auth-user.interface';

// Lado candidato: landing pública de la invitación, SIN auth obligatoria —
// el token en la URL sigue siendo la única credencial necesaria. Si además
// el candidato está logueado con su cuenta de práctica, el intento oficial
// queda vinculado a ella (ver OptionalCandidateAuthGuard) sin que la
// invitación deje de funcionar para cualquiera sin cuenta.
@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Datos públicos de una invitación (landing del candidato)' })
  getByToken(@Param('token') token: string) {
    return this.invitationsService.getPublicView(token);
  }

  @Post(':token/start')
  @UseGuards(OptionalCandidateAuthGuard)
  @ApiOperation({
    summary:
      'Inicia el intento del candidato (o retoma el existente); si hay un candidato logueado, vincula el intento a su cuenta',
  })
  start(
    @Param('token') token: string,
    @Body() dto: StartInvitationDto,
    @OptionalCandidate() candidate: AuthenticatedCandidate | null,
  ) {
    return this.invitationsService.startOrResume(token, dto.candidateName, candidate?.candidateId);
  }
}
