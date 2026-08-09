import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attempt, AttemptStatus } from './entities/attempt.entity';
import { AttemptAnswer } from './entities/attempt-answer.entity';
import { AttemptFeedback } from './entities/attempt-feedback.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { Invitation, InvitationStatus } from '../invitations/entities/invitation.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { ExecutorService } from '../executor/executor.service';
import { AttemptResult, AttemptWithQuestions, SanitizedQuestion } from './attempts.types';
import { computeLevel } from '../assessments/level.util';

@Injectable()
export class AttemptsService {
  constructor(
    @InjectRepository(Attempt)
    private readonly attemptRepository: Repository<Attempt>,
    @InjectRepository(AttemptAnswer)
    private readonly answerRepository: Repository<AttemptAnswer>,
    @InjectRepository(AttemptFeedback)
    private readonly feedbackRepository: Repository<AttemptFeedback>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    private readonly executorService: ExecutorService,
  ) {}

  // Encuesta breve al candidato (rating 1-5 + comentario opcional) sobre la
  // EXPERIENCIA CON LA PLATAFORMA, no con el contenido del assessment — solo
  // tiene sentido una vez el candidato ya vio su resultado. Upsert: si ya
  // había enviado una, la reemplaza en vez de fallar.
  async submitFeedback(attemptId: string, dto: SubmitFeedbackDto): Promise<{ saved: true }> {
    const attempt = await this.attemptRepository.findOne({ where: { id: attemptId } });

    if (!attempt) {
      throw new NotFoundException(`Intento ${attemptId} no encontrado`);
    }
    if (attempt.status !== AttemptStatus.COMPLETED) {
      throw new BadRequestException('Solo se puede dejar feedback después de finalizar');
    }

    const existing = await this.feedbackRepository.findOne({ where: { attemptId } });

    if (existing) {
      existing.rating = dto.rating;
      existing.comment = dto.comment ?? null;
      await this.feedbackRepository.save(existing);
    } else {
      await this.feedbackRepository.save(
        this.feedbackRepository.create({
          attemptId,
          rating: dto.rating,
          comment: dto.comment ?? null,
        }),
      );
    }

    return { saved: true };
  }

  // candidateId es un parámetro interno (nunca viene del DTO público que
  // acepta el controller /attempts): solo lo pasa PracticeService cuando un
  // candidato logueado inicia un simulacro. Aceptarlo desde el DTO abriría
  // la puerta a que cualquiera se atribuya un intento ajeno.
  async create(dto: CreateAttemptDto, candidateId?: string): Promise<AttemptWithQuestions> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: dto.assessmentId },
      relations: { questions: { question: { options: true } } },
      order: { questions: { position: 'ASC' } },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${dto.assessmentId} no encontrado`);
    }

    const attempt = await this.attemptRepository.save(
      this.attemptRepository.create({
        assessmentId: assessment.id,
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail ?? null,
        candidateId: candidateId ?? null,
        status: AttemptStatus.IN_PROGRESS,
        maxScore: assessment.questions.length,
      }),
    );

    return this.buildSanitizedView(attempt, assessment);
  }

  async findOne(id: string): Promise<AttemptWithQuestions> {
    const { attempt, assessment } = await this.loadAttemptWithAssessment(id);

    return this.buildSanitizedView(attempt, assessment);
  }

  async submitAnswer(
    attemptId: string,
    questionId: string,
    dto: SubmitAnswerDto,
  ): Promise<{ saved: true }> {
    const { attempt, question } = await this.loadInProgressAttemptQuestion(
      attemptId,
      questionId,
    );

    let answer = await this.answerRepository.findOne({
      where: { attemptId: attempt.id, questionId: question.id },
    });

    if (!answer) {
      answer = this.answerRepository.create({ attemptId: attempt.id, questionId: question.id });
    }

    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      answer.selectedOptionId = dto.selectedOptionId ?? null;
    } else {
      answer.submittedCode = dto.code ?? null;
    }

    await this.answerRepository.save(answer);

    return { saved: true };
  }

  async runCode(attemptId: string, questionId: string, code: string) {
    const { attempt, question } = await this.loadInProgressAttemptQuestion(
      attemptId,
      questionId,
    );

    if (question.type !== QuestionType.CODE) {
      throw new BadRequestException('Esta pregunta no es de tipo código');
    }

    const visibleTestCases = (question.testCases || []).filter((tc) => !tc.hidden);
    const result = await this.executorService.run({
      code,
      testCases: visibleTestCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
    });

    let answer = await this.answerRepository.findOne({
      where: { attemptId: attempt.id, questionId: question.id },
    });

    if (!answer) {
      answer = this.answerRepository.create({ attemptId: attempt.id, questionId: question.id });
    }

    answer.submittedCode = code;
    answer.lastRunResult = result;
    await this.answerRepository.save(answer);

    return result;
  }

  // Lectura pura del resultado: NO finaliza el intento. Si el candidato
  // navega manualmente a la página de resultado antes de terminar, esto
  // rechaza con 400 en vez de completar el intento por accidente (a
  // diferencia de finish(), que sí es la acción mutante e idempotente
  // disparada por el botón "Finalizar").
  async getResult(attemptId: string): Promise<AttemptResult> {
    const { attempt, assessment } = await this.loadAttemptWithAssessment(attemptId);

    if (attempt.status !== AttemptStatus.COMPLETED) {
      throw new BadRequestException('El intento aún no ha finalizado');
    }

    return this.buildResultView(attempt, assessment);
  }

  async finish(attemptId: string): Promise<AttemptResult> {
    const { attempt, assessment } = await this.loadAttemptWithAssessment(attemptId);

    if (attempt.status === AttemptStatus.COMPLETED) {
      return this.buildResultView(attempt, assessment);
    }

    const answers = await this.answerRepository.find({ where: { attemptId: attempt.id } });
    const answersByQuestionId = new Map(answers.map((a) => [a.questionId, a]));

    let totalPoints = 0;

    for (const aq of assessment.questions) {
      const question = aq.question;
      const answer = answersByQuestionId.get(question.id);
      let isCorrect = false;

      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        const correctOption = question.options.find((o) => o.isCorrect);
        isCorrect = Boolean(
          answer?.selectedOptionId && answer.selectedOptionId === correctOption?.id,
        );
      } else {
        // Re-ejecuta contra TODOS los test cases (incluidos los ocultos):
        // el resultado de "Run" del candidato solo usaba los visibles.
        const code = answer?.submittedCode;

        if (code) {
          const result = await this.executorService.run({
            code,
            testCases: (question.testCases || []).map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
            })),
          });
          isCorrect = result.allPassed;
        }
      }

      const points = isCorrect ? 1 : 0;
      totalPoints += points;

      if (answer) {
        answer.isCorrect = isCorrect;
        answer.points = points;
        await this.answerRepository.save(answer);
      } else {
        await this.answerRepository.save(
          this.answerRepository.create({
            attemptId: attempt.id,
            questionId: question.id,
            isCorrect,
            points,
          }),
        );
      }
    }

    attempt.status = AttemptStatus.COMPLETED;
    attempt.score = totalPoints;
    attempt.finishedAt = new Date();
    await this.attemptRepository.save(attempt);

    // Si este attempt vino de una invitación oficial, la marca COMPLETED.
    // Acoplamiento a nivel de entidad, no de módulo (ver AttemptsModule):
    // no todo attempt tiene invitación (los de práctica no la tienen).
    await this.invitationRepository.update(
      { attemptId: attempt.id },
      { status: InvitationStatus.COMPLETED, completedAt: new Date() },
    );

    return this.buildResultView(attempt, assessment);
  }

  private async loadAttemptWithAssessment(
    attemptId: string,
  ): Promise<{ attempt: Attempt; assessment: Assessment }> {
    const attempt = await this.attemptRepository.findOne({ where: { id: attemptId } });

    if (!attempt) {
      throw new NotFoundException(`Intento ${attemptId} no encontrado`);
    }

    const assessment = await this.assessmentRepository.findOne({
      where: { id: attempt.assessmentId },
      relations: { questions: { question: { options: true } } },
      order: { questions: { position: 'ASC' } },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${attempt.assessmentId} no encontrado`);
    }

    return { attempt, assessment };
  }

  private async loadInProgressAttemptQuestion(
    attemptId: string,
    questionId: string,
  ): Promise<{ attempt: Attempt; question: Question }> {
    const { attempt, assessment } = await this.loadAttemptWithAssessment(attemptId);

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('El intento ya fue finalizado');
    }

    // Corte del lado del servidor, no solo visual: si el tiempo del examen
    // ya expiró, no se aceptan más respuestas ni ejecuciones de código. El
    // candidato (o su timer en el frontend) debe llamar a /finish, que sí
    // sigue permitido siempre (califica lo que ya se alcanzó a responder).
    const deadline = this.getDeadline(attempt, assessment);
    if (deadline && deadline.getTime() < Date.now()) {
      throw new BadRequestException('El tiempo del examen expiró');
    }

    const aq = assessment.questions.find((q) => q.questionId === questionId);

    if (!aq) {
      throw new NotFoundException('La pregunta no pertenece a este assessment');
    }

    return { attempt, question: aq.question };
  }

  private getDeadline(attempt: Attempt, assessment: Assessment): Date | null {
    if (!assessment.timeLimitMinutes) return null;

    return new Date(attempt.startedAt.getTime() + assessment.timeLimitMinutes * 60 * 1000);
  }

  private buildSanitizedView(attempt: Attempt, assessment: Assessment): AttemptWithQuestions {
    const questions: SanitizedQuestion[] = assessment.questions.map((aq) => ({
      id: aq.question.id,
      title: aq.question.title,
      statement: aq.question.statement,
      category: aq.question.category,
      difficulty: aq.question.difficulty,
      type: aq.question.type,
      position: aq.position,
      codeTemplate: aq.question.codeTemplate,
      visibleTestCases: (aq.question.testCases || [])
        .filter((tc) => !tc.hidden)
        .map((tc) => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
      options: (aq.question.options || []).map((o) => ({ id: o.id, text: o.text })),
    }));

    return {
      id: attempt.id,
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      candidateName: attempt.candidateName,
      status: attempt.status,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      score: attempt.score,
      maxScore: attempt.maxScore,
      deadline: this.getDeadline(attempt, assessment),
      questions,
    };
  }

  private async buildResultView(attempt: Attempt, assessment: Assessment): Promise<AttemptResult> {
    const answers = await this.answerRepository.find({ where: { attemptId: attempt.id } });
    const answersByQuestionId = new Map(answers.map((a) => [a.questionId, a]));

    const scorePercentage =
      attempt.score !== null && attempt.maxScore > 0
        ? (attempt.score / attempt.maxScore) * 100
        : 0;

    return {
      id: attempt.id,
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      candidateName: attempt.candidateName,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
      level: attempt.score !== null ? computeLevel(scorePercentage, assessment.levelThresholds) : null,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      breakdown: assessment.questions.map((aq) => {
        const answer = answersByQuestionId.get(aq.questionId);

        return {
          questionId: aq.questionId,
          title: aq.question.title,
          type: aq.question.type,
          isCorrect: answer?.isCorrect ?? false,
          points: answer?.points ?? 0,
          explanation: aq.question.explanation,
        };
      }),
    };
  }
}
