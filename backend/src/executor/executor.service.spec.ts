const sendMock = jest.fn();

jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
  InvokeCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

import { ExecutorService } from './executor.service';

describe('ExecutorService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    sendMock.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('modo local (default)', () => {
    it('corre runner.js real y detecta una solución correcta', async () => {
      delete process.env.EXECUTOR_MODE;
      const service = new ExecutorService();

      const result = await service.run({
        code: 'function solution(n) { return String(n * 2); }',
        testCases: [{ input: 3, expectedOutput: '6' }],
      });

      expect(result.allPassed).toBe(true);
    });

    it('corre runner.js real y detecta una solución incorrecta', async () => {
      process.env.EXECUTOR_MODE = 'local';
      const service = new ExecutorService();

      const result = await service.run({
        code: 'function solution(n) { return "0"; }',
        testCases: [{ input: 3, expectedOutput: '6' }],
      });

      expect(result.allPassed).toBe(false);
      expect(result.results[0].actual).toBe('0');
    });
  });

  describe('modo lambda', () => {
    it('invoca la Lambda executor y parsea la respuesta', async () => {
      process.env.EXECUTOR_MODE = 'lambda';
      process.env.EXECUTOR_FUNCTION_NAME = 'assessment-backend-executor';
      sendMock.mockResolvedValue({
        Payload: Buffer.from(JSON.stringify({ results: [], allPassed: true })),
      });

      const service = new ExecutorService();
      const result = await service.run({ code: 'x', testCases: [] });

      expect(result.allPassed).toBe(true);
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ FunctionName: 'assessment-backend-executor' }),
      );
    });

    it('lanza error si falta EXECUTOR_FUNCTION_NAME', async () => {
      process.env.EXECUTOR_MODE = 'lambda';
      delete process.env.EXECUTOR_FUNCTION_NAME;

      const service = new ExecutorService();

      await expect(service.run({ code: 'x', testCases: [] })).rejects.toThrow(
        'EXECUTOR_FUNCTION_NAME',
      );
    });

    it('devuelve un resultado de error controlado si la Lambda falla (FunctionError)', async () => {
      process.env.EXECUTOR_MODE = 'lambda';
      process.env.EXECUTOR_FUNCTION_NAME = 'assessment-backend-executor';
      sendMock.mockResolvedValue({ FunctionError: 'Unhandled' });

      const service = new ExecutorService();
      const result = await service.run({ code: 'x', testCases: [] });

      expect(result.allPassed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
