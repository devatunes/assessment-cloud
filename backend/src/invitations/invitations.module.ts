import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invitation } from './entities/invitation.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { AttemptsModule } from '../attempts/attempts.module';
import { InvitationsService } from './invitations.service';
import { AssessmentInvitationsController } from './assessment-invitations.controller';
import { InvitationsController } from './invitations.controller';
import { OptionalCandidateAuthGuard } from '../candidate-auth/optional-candidate-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, Assessment, Candidate]),
    AttemptsModule,
    // Instancia propia de JwtModule (mismo JWT_SECRET, solo para VERIFICAR):
    // OptionalCandidateAuthGuard necesita JwtService acá porque es un
    // provider de este módulo, no de CandidateAuthModule.
    JwtModule.registerAsync({
      useFactory: () => ({ secret: process.env.JWT_SECRET || 'assessment-cloud-secret-dev' }),
    }),
  ],
  controllers: [AssessmentInvitationsController, InvitationsController],
  providers: [InvitationsService, OptionalCandidateAuthGuard],
})
export class InvitationsModule {}
