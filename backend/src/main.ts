import { createApp } from './bootstrap';
import { runPendingMigrations } from './database/run-migrations';

async function bootstrap() {
  if ((process.env.DB_MIGRATIONS_RUN || 'false').toLowerCase() === 'true') {
    await runPendingMigrations();
  }

  const app = await createApp();
  const port = process.env.PORT || 3000;

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Assessment backend escuchando en http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger disponible en http://localhost:${port}/docs`);
}

bootstrap();
