import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { StartInvitationDto } from './dto/start-invitation.dto';

// Lado candidato: landing pública de la invitación, SIN auth — el token en
// la URL es la única credencial (igual que antes con el flujo abierto, pero
// ahora acotado a un candidato específico en vez de una lista pública).
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
  @ApiOperation({ summary: 'Inicia el intento del candidato (o retoma el existente)' })
  start(@Param('token') token: string, @Body() dto: StartInvitationDto) {
    return this.invitationsService.startOrResume(token, dto.candidateName);
  }
}
