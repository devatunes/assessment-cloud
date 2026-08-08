import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attempt, AttemptStatus } from './entities/attempt.entity';
import { AttemptAnswer } from './entities/attempt-answer.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { ExecutorService } from '../executor/executor.service';
import { AttemptWithQuestions, SanitizedQuestion } from './attempts.types';

@Injectable()
export class AttemptsService {
  constructor(
    @InjectRepository(Attempt)
    private readonly attemptRepository: Repository<Attempt>,
    @InjectRepository(AttemptAnswer)
    private readonly answerRepository: Repository<AttemptAnswer>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    private readonly executorService: ExecutorService,
  ) {}

  async create(dto: CreateAttemptDto): Promise<AttemptWithQuestions> {
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

  async finish(attemptId: string) {
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

    const aq = assessment.questions.find((q) => q.questionId === questionId);

    if (!aq) {
      throw new NotFoundException('La pregunta no pertenece a este assessment');
    }

    return { attempt, question: aq.question };
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
      questions,
    };
  }

  private async buildResultView(attempt: Attempt, assessment: Assessment) {
    const answers = await this.answerRepository.find({ where: { attemptId: attempt.id } });
    const answersByQuestionId = new Map(answers.map((a) => [a.questionId, a]));

    return {
      id: attempt.id,
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      candidateName: attempt.candidateName,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
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
        };
      }),
    };
  }
}
