import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attempt } from './entities/attempt.entity';
import { AttemptAnswer } from './entities/attempt-answer.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';
import { ExecutorModule } from '../executor/executor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attempt, AttemptAnswer, Assessment]),
    ExecutorModule,
  ],
  controllers: [AttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
