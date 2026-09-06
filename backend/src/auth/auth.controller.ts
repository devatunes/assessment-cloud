import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto } from './dto/login.dto';
import { InviteTeammateDto } from './dto/invite-teammate.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { CurrentUser } from './current-user.decorator';
import { AuthenticatedUser } from './auth-user.interface';
import { UserRole } from '../users/entities/user.entity';

function clientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-organization')
  @ApiOperation({ summary: 'Crea una organización nueva + su primer usuario ADMIN' })
  registerOrganization(@Body() dto: RegisterOrganizationDto) {
    return this.authService.registerOrganization(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login de staff de organización (admin/reclutador)' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, clientIp(req));
  }

  @Post('invite-teammate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invita un nuevo usuario a la organización (solo admin)' })
  inviteTeammate(
    @Body() dto: InviteTeammateDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.authService.inviteTeammate(currentUser.organizationId, dto);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Activa la cuenta de un usuario invitado fijando su contraseña' })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Datos del usuario autenticado' })
  me(@CurrentUser() currentUser: AuthenticatedUser) {
    return currentUser;
  }
}
