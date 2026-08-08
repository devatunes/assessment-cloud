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

// La RDS de esta app se deja siempre encendida (uso puntual de la kata,
// sin scheduler de apagado por inactividad como en contably), así que el
// handler no necesita el gate de "base de datos arrancando".
export const handler: Handler = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }

  return cachedServer(event, context, callback);
};
