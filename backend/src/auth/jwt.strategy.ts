import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './auth-user.interface';
import { UserRole } from '../users/entities/user.entity';

// Estrategia JWT para el staff de organización (recruiter/admin). Audience
// distinto al de candidate-auth (ver JWT_AUDIENCE vs CANDIDATE_JWT_AUDIENCE)
// para que un token de un sistema nunca sea válido en el otro, aunque
// compartan el mismo JWT_SECRET.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-org') {
  constructor() {
    const secret = process.env.JWT_SECRET || 'assessment-cloud-secret-dev';

    if (process.env.NODE_ENV === 'production' && secret === 'assessment-cloud-secret-dev') {
      throw new Error('JWT_SECRET debe configurarse en producción');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: process.env.JWT_ISSUER || 'assessment-cloud-api',
      audience: process.env.JWT_AUDIENCE || 'assessment-cloud-org',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: UserRole;
    organizationId: string;
  }): Promise<AuthenticatedUser> {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
