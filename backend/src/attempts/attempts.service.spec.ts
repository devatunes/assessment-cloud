import { BadRequestException } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { AttemptStatus } from './entities/attempt.entity';
import { QuestionType } from '../questions/entities/question.entity';

// Fixture de un assessment con 1 pregunta de opción múltiple y 1 de código
// (con un test case visible y uno oculto), tal como los devolvería TypeORM
// con las relations cargadas.
function buildAssessmentFixture() {
  return {
    id: 'assessment-1',
    questions: [
      {
        questionId: 'q-mc',
        position: 0,
        question: {
          id: 'q-mc',
          title: 'MC question',
          type: QuestionType.MULTIPLE_CHOICE,
          options: [
            { id: 'opt-correct', isCorrect: true },
            { id: 'opt-wrong', isCorrect: false },
          ],
          testCases: null,
        },
      },
      {
        questionId: 'q-code',
        position: 1,
        question: {
          id: 'q-code',
          title: 'Code question',
          type: QuestionType.CODE,
          options: [],
          testCases: [
            { input: 1, expectedOutput: '1', hidden: false },
            { input: 2, expectedOutput: '2', hidden: true },
          ],
        },
      },
    ],
  };
}

describe('AttemptsService', () => {
  let service: AttemptsService;
  let attemptRepository: any;
  let answerRepository: any;
  let assessmentRepository: any;
  let executorService: any;

  beforeEach(() => {
    attemptRepository = {
      findOne: jest.fn(),
      save: jest.fn((a: unknown) => Promise.resolve(a)),
      create: jest.fn((a: unknown) => a),
    };
    answerRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((a: unknown) => Promise.resolve(a)),
      create: jest.fn((a: unknown) => a),
    };
    assessmentRepository = { findOne: jest.fn() };
    executorService = { run: jest.fn() };

    service = new AttemptsService(
      attemptRepository,
      answerRepository,
      assessmentRepository,
      executorService,
    );
  });

  describe('finish', () => {
    it('otorga puntos cuando la opción de MC seleccionada es la correcta', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'attempt-1',
        status: AttemptStatus.IN_PROGRESS,
        assessmentId: assessment.id,
        maxScore: 2,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);
      answerRepository.find.mockResolvedValue([
        { questionId: 'q-mc', selectedOptionId: 'opt-correct' },
        { questionId: 'q-code', submittedCode: 'function solution(n){return String(n);}' },
      ]);
      executorService.run.mockResolvedValue({ results: [], allPassed: true });

      const result = await service.finish('attempt-1');

      expect(result.score).toBe(2);
      expect(result.breakdown.find((b) => b.questionId === 'q-mc')?.isCorrect).toBe(true);
      expect(result.breakdown.find((b) => b.questionId === 'q-code')?.isCorrect).toBe(true);
    });

    it('marca incorrecta la respuesta de MC cuando la opción no coincide con la correcta', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'attempt-1',
        status: AttemptStatus.IN_PROGRESS,
        assessmentId: assessment.id,
        maxScore: 2,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);
      answerRepository.find.mockResolvedValue([
        { questionId: 'q-mc', selectedOptionId: 'opt-wrong' },
      ]);
      executorService.run.mockResolvedValue({ results: [], allPassed: false });

      const result = await service.finish('attempt-1');

      expect(result.breakdown.find((b) => b.questionId === 'q-mc')?.isCorrect).toBe(false);
      expect(result.breakdown.find((b) => b.questionId === 'q-mc')?.points).toBe(0);
    });

    it('marca incorrecta una pregunta de MC sin responder, sin lanzar error', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'attempt-1',
        status: AttemptStatus.IN_PROGRESS,
        assessmentId: assessment.id,
        maxScore: 2,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);
      answerRepository.find.mockResolvedValue([]); // nada respondido

      const result = await service.finish('attempt-1');

      expect(result.score).toBe(0);
      expect(result.breakdown.every((b) => !b.isCorrect)).toBe(true);
    });

    it('re-ejecuta el código contra TODOS los test cases, incluidos los ocultos', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'attempt-1',
        status: AttemptStatus.IN_PROGRESS,
        assessmentId: assessment.id,
        maxScore: 2,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);
      answerRepository.find.mockResolvedValue([
        { questionId: 'q-code', submittedCode: 'function solution(n){return String(n);}' },
      ]);
      executorService.run.mockResolvedValue({ results: [], allPassed: true });

      await service.finish('attempt-1');

      expect(executorService.run).toHaveBeenCalledWith(
        expect.objectContaining({
          testCases: [
            { input: 1, expectedOutput: '1' },
            { input: 2, expectedOutput: '2' }, // el oculto SÍ se incluye al finalizar
          ],
        }),
      );
    });

    it('es idempotente: si el intento ya está COMPLETED, no vuelve a ejecutar código', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'attempt-1',
        status: AttemptStatus.COMPLETED,
        assessmentId: assessment.id,
        score: 2,
        maxScore: 2,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);
      answerRepository.find.mockResolvedValue([]);

      const result = await service.finish('attempt-1');

      expect(executorService.run).not.toHaveBeenCalled();
      expect(attemptRepository.save).not.toHaveBeenCalled();
      expect(result.score).toBe(2);
    });
  });

  describe('getResult', () => {
    it('rechaza con BadRequestException si el intento sigue IN_PROGRESS (no lo finaliza)', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'a1',
        status: AttemptStatus.IN_PROGRESS,
        assessmentId: assessment.id,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);

      await expect(service.getResult('a1')).rejects.toBeInstanceOf(BadRequestException);
      expect(executorService.run).not.toHaveBeenCalled();
    });

    it('devuelve el resultado si el intento ya está COMPLETED', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'a1',
        status: AttemptStatus.COMPLETED,
        assessmentId: assessment.id,
        score: 1,
        maxScore: 2,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);
      answerRepository.find.mockResolvedValue([]);

      const result = await service.getResult('a1');

      expect(result.score).toBe(1);
    });
  });

  describe('runCode', () => {
    it('rechaza con BadRequestException si la pregunta no es de tipo CODE', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'a1',
        status: AttemptStatus.IN_PROGRESS,
        assessmentId: assessment.id,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);

      await expect(service.runCode('a1', 'q-mc', 'code')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('solo envía al executor los test cases NO ocultos', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'a1',
        status: AttemptStatus.IN_PROGRESS,
        assessmentId: assessment.id,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);
      executorService.run.mockResolvedValue({ results: [], allPassed: true });

      await service.runCode('a1', 'q-code', 'function solution(n){return String(n);}');

      expect(executorService.run).toHaveBeenCalledWith({
        code: 'function solution(n){return String(n);}',
        testCases: [{ input: 1, expectedOutput: '1' }],
      });
    });

    it('rechaza con BadRequestException si el intento ya fue finalizado', async () => {
      const assessment = buildAssessmentFixture();
      attemptRepository.findOne.mockResolvedValue({
        id: 'a1',
        status: AttemptStatus.COMPLETED,
        assessmentId: assessment.id,
      });
      assessmentRepository.findOne.mockResolvedValue(assessment);

      await expect(service.runCode('a1', 'q-code', 'code')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
