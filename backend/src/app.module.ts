import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { QuestionsModule } from './questions/questions.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { AttemptsModule } from './attempts/attempts.module';
import { ExecutorModule } from './executor/executor.module';

@Module({
  imports: [
    DatabaseModule,
    QuestionsModule,
    AssessmentsModule,
    AttemptsModule,
    ExecutorModule,
  ],
})
export class AppModule {}
