import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from '../assessments/entities/assessment.entity';
import { AssessmentQuestion } from '../assessments/entities/assessment-question.entity';
import { Attempt } from '../attempts/entities/attempt.entity';
import { AttemptsModule } from '../attempts/attempts.module';
import { PracticeService } from './practice.service';
import { PracticeController } from './practice.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assessment, AssessmentQuestion, Attempt]),
    AttemptsModule,
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
