import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CandidatesModule } from '../candidates/candidates.module';
import { LoginAttemptsService } from '../auth/login-attempts.service';
import { CandidateAuthController } from './candidate-auth.controller';
import { CandidateAuthService } from './candidate-auth.service';
import { JwtCandidateStrategy } from './jwt-candidate.strategy';

@Module({
  imports: [
    CandidatesModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET || 'assessment-cloud-secret-dev';

        if (process.env.NODE_ENV === 'production' && secret === 'assessment-cloud-secret-dev') {
          throw new Error('JWT_SECRET debe configurarse en producción');
        }

        return {
          secret,
          signOptions: {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
            issuer: process.env.JWT_ISSUER || 'assessment-cloud-api',
            audience: process.env.CANDIDATE_JWT_AUDIENCE || 'assessment-cloud-candidates',
          },
        };
      },
    }),
  ],
  controllers: [CandidateAuthController],
  // LoginAttemptsService acá es una instancia propia (estado en memoria
  // separado del de AuthModule): un candidato bloqueado por intentos
  // fallidos no afecta el bloqueo del staff de organización, y viceversa.
  providers: [CandidateAuthService, JwtCandidateStrategy, LoginAttemptsService],
  exports: [JwtModule],
})
export class CandidateAuthModule {}
