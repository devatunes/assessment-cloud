import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attempt } from './entities/attempt.entity';
import { AttemptAnswer } from './entities/attempt-answer.entity';
import { AttemptFeedback } from './entities/attempt-feedback.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { Invitation } from '../invitations/entities/invitation.entity';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';
import { ExecutorModule } from '../executor/executor.module';

@Module({
  imports: [
    // Invitation acá es solo para que AttemptsService pueda marcar la
    // invitación asociada como COMPLETED al finalizar — se importa la
    // ENTIDAD, no InvitationsModule completo (evita un ciclo de módulos,
    // ya que InvitationsModule sí importa AttemptsModule).
    TypeOrmModule.forFeature([Attempt, AttemptAnswer, AttemptFeedback, Assessment, Invitation]),
    ExecutorModule,
  ],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
