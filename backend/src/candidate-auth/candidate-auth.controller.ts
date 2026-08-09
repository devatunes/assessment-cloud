import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CandidateAuthService } from './candidate-auth.service';
import { RegisterCandidateDto } from './dto/register-candidate.dto';
import { LoginCandidateDto } from './dto/login-candidate.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { CandidateJwtAuthGuard } from './candidate-jwt-auth.guard';
import { CurrentCandidate } from './current-candidate.decorator';
import { AuthenticatedCandidate } from './candidate-auth-user.interface';

function clientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
}

@ApiTags('candidate-auth')
@Controller('candidate-auth')
export class CandidateAuthController {
  constructor(private readonly candidateAuthService: CandidateAuthService) {}

  @Get('check-email')
  @ApiOperation({
    summary: 'Indica si un correo ya tiene cuenta de candidato (para decidir login vs. registro al aterrizar en una invitación)',
  })
  async checkEmail(@Query() query: CheckEmailDto): Promise<{ exists: boolean }> {
    const existing = await this.candidateAuthService.findByEmail(query.email);
    return { exists: existing !== null };
  }

  @Post('register')
  @ApiOperation({ summary: 'Un candidato se registra por su cuenta, sin invitación' })
  register(@Body() dto: RegisterCandidateDto) {
    return this.candidateAuthService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login de candidato' })
  login(@Body() dto: LoginCandidateDto, @Req() req: Request) {
    return this.candidateAuthService.login(dto, clientIp(req));
  }

  @Get('me')
  @UseGuards(CandidateJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Datos del candidato autenticado' })
  me(@CurrentCandidate() candidate: AuthenticatedCandidate) {
    return candidate;
  }
}
