import { Handler } from 'aws-lambda';
import { createApp } from './bootstrap';
import { runPendingMigrations } from './database/run-migrations';

const serverlessExpress =
  require('@codegenie/serverless-express') as typeof import('@codegenie/serverless-express').default;

let cachedServer: ReturnType<typeof serverlessExpress> | undefined;
let migrationsRan = false;

async function bootstrapServer() {
  if (!migrationsRan && (process.env.DB_MIGRATIONS_RUN || 'false').toLowerCase() === 'true') {
    await runPendingMigrations();
    migrationsRan = true;
  }

  const app = await createApp();
  await app.init();

  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

// Handler de 2 parámetros a propósito: Node.js 24 en Lambda rechaza
// cualquier handler con un tercer parámetro `callback`, aunque no se use.
export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }

  const promiseHandler = cachedServer as unknown as (
    event: unknown,
    context: unknown,
  ) => Promise<unknown>;

  return promiseHandler(event, context);
};
