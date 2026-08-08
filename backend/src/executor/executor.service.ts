import { Injectable, Logger } from '@nestjs/common';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { ExecutorRunPayload, ExecutorRunResult } from './executor.types';

// Ejecuta el código del candidato contra un set de test cases.
// - EXECUTOR_MODE=local: corre runner.js in-process (docker-compose / dev)
// - EXECUTOR_MODE=lambda: invoca la Lambda "assessment-executor" (AWS)
// El contrato de entrada/salida es idéntico en ambos modos (ver executor/runner.js).
// El require de runner.js va DENTRO del método (no en el top del módulo):
// en el zip de la Lambda del backend no existe ../../../executor/runner.js
// (ese código vive en la Lambda executor aparte), así que solo debe
// resolverse cuando EXECUTOR_MODE=local.
@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);
  private readonly lambdaClient = new LambdaClient({});

  async run(payload: ExecutorRunPayload): Promise<ExecutorRunResult> {
    const mode = (process.env.EXECUTOR_MODE || 'local').toLowerCase();

    if (mode === 'lambda') {
      return this.runViaLambda(payload);
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runTestCases } = require('../../../executor/runner') as {
      runTestCases: (payload: ExecutorRunPayload) => ExecutorRunResult;
    };

    return runTestCases(payload);
  }

  private async runViaLambda(payload: ExecutorRunPayload): Promise<ExecutorRunResult> {
    const functionName = process.env.EXECUTOR_FUNCTION_NAME;

    if (!functionName) {
      throw new Error('Falta la variable de entorno EXECUTOR_FUNCTION_NAME');
    }

    const response = await this.lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        Payload: Buffer.from(JSON.stringify(payload)),
      }),
    );

    if (response.FunctionError) {
      this.logger.error('El executor devolvió un error', {
        functionError: response.FunctionError,
      });

      return {
        results: [],
        allPassed: false,
        error: 'Error interno ejecutando el código',
      };
    }

    const raw = response.Payload ? Buffer.from(response.Payload).toString('utf8') : '{}';

    return JSON.parse(raw) as ExecutorRunResult;
  }
}
