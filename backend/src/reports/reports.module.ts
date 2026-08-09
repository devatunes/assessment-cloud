import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from '../assessments/entities/assessment.entity';
import { Invitation } from '../invitations/entities/invitation.entity';
import { Attempt } from '../attempts/entities/attempt.entity';
import { AttemptAnswer } from '../attempts/entities/attempt-answer.entity';
import { ReportsService } from './reports.service';
import { AssessmentReportController } from './assessment-report.controller';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment, Invitation, Attempt, AttemptAnswer])],
  controllers: [AssessmentReportController, ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
