import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from './entities/assessment.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { Question } from '../questions/entities/question.entity';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment, AssessmentQuestion, Question])],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
