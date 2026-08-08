import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source';

// Corre las migraciones pendientes (incluye el seed, ver migrations/).
// Se invoca una sola vez al arrancar el proceso (main.ts en local,
// lambda.ts en AWS) cuando DB_MIGRATIONS_RUN=true. Usa su propia
// DataSource (no la de Nest) para poder cerrarla apenas termina.
export async function runPendingMigrations(): Promise<void> {
  const source = new DataSource(buildDataSourceOptions());
  await source.initialize();

  const executed = await source.runMigrations();

  if (executed.length > 0) {
    console.info(
      '[Migrations] Ejecutadas:',
      executed.map((m) => m.name),
    );
  } else {
    console.info('[Migrations] No había migraciones pendientes');
  }

  await source.destroy();
}
