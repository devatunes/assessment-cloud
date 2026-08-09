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

@Module({
  imports: [
    DatabaseModule,
    OrganizationsModule,
    UsersModule,
    AuthModule,
    QuestionsModule,
    AssessmentsModule,
    AttemptsModule,
    ExecutorModule,
    InvitationsModule,
  ],
})
export class AppModule {}
