import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invitation } from './entities/invitation.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { AttemptsModule } from '../attempts/attempts.module';
import { InvitationsService } from './invitations.service';
import { AssessmentInvitationsController } from './assessment-invitations.controller';
import { InvitationsController } from './invitations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation, Assessment]), AttemptsModule],
  controllers: [AssessmentInvitationsController, InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
