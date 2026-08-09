import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { QuestionsModule } from './questions/questions.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { AttemptsModule } from './attempts/attempts.module';
import { ExecutorModule } from './executor/executor.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { InvitationsModule } from './invitations/invitations.module';
import { QuestionBanksModule } from './question-banks/question-banks.module';
import { CandidatesModule } from './candidates/candidates.module';
import { CandidateAuthModule } from './candidate-auth/candidate-auth.module';
import { PracticeModule } from './practice/practice.module';
import { BadgesModule } from './badges/badges.module';

@Module({
  imports: [
    DatabaseModule,
    OrganizationsModule,
    UsersModule,
    AuthModule,
    QuestionsModule,
    QuestionBanksModule,
    AssessmentsModule,
    AttemptsModule,
    ExecutorModule,
    InvitationsModule,
    CandidatesModule,
    CandidateAuthModule,
    PracticeModule,
    BadgesModule,
  ],
})
export class AppModule {}
