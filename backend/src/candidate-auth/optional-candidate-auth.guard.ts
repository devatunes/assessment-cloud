import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// A diferencia de CandidateJwtAuthGuard, este NUNCA rechaza la request: si no
// hay Bearer o es inválido/expirado, sigue como anónimo (request.candidate
// queda undefined). Se usa en endpoints públicos que quieren "reconocer" a un
// candidato logueado sin exigir que lo esté — ver InvitationsController.start,
// que vincula el intento oficial a la cuenta del candidato si aplica.
@Injectable()
export class OptionalCandidateAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwtService.verifyAsync(authHeader.slice(7), {
          audience: process.env.CANDIDATE_JWT_AUDIENCE || 'assessment-cloud-candidates',
          issuer: process.env.JWT_ISSUER || 'assessment-cloud-api',
        });
        request.candidate = { candidateId: payload.sub, email: payload.email, name: payload.name };
      } catch {
        // Token ausente/inválido/expirado: sigue como anónimo, no falla.
      }
    }

    return true;
  }
}
