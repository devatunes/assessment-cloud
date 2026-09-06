import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedCandidate } from './candidate-auth-user.interface';

// Estrategia JWT para candidatos (practican por su cuenta). Audience
// distinto al del staff de organización (ver auth/jwt.strategy.ts) para que
// un token de un sistema nunca sea válido en el otro, aunque compartan el
// mismo JWT_SECRET.
@Injectable()
export class JwtCandidateStrategy extends PassportStrategy(Strategy, 'jwt-candidate') {
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
      audience: process.env.CANDIDATE_JWT_AUDIENCE || 'assessment-cloud-candidates',
    });
  }

  async validate(payload: { sub: string; email: string; name: string }): Promise<AuthenticatedCandidate> {
    return {
      candidateId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }
}
