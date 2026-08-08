export type ExecutorTestCase = {
  input: unknown;
  expectedOutput: string;
};

export type ExecutorTestCaseResult = {
  input: unknown;
  expected: string;
  actual: string;
  stderr: string;
  timedOut: boolean;
  passed: boolean;
};

export type ExecutorRunResult = {
  results: ExecutorTestCaseResult[];
  allPassed: boolean;
  error?: string;
};

export type ExecutorRunPayload = {
  code: string;
  testCases: ExecutorTestCase[];
  timeoutMs?: number;
};
