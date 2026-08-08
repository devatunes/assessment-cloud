import { Client } from 'pg';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Prueba de flujo completo contra un Postgres real (docker-compose db,
// puerto 5433) y una base de datos dedicada ("assessment_test") para no
// tocar los datos de desarrollo. Cubre el camino feliz completo
// (biblioteca -> assessment -> intento -> responder -> ejecutar -> finalizar)
// y los bugs corregidos: validación de test cases con input real, tope de
// test cases, opciones huérfanas al editar, y el guard de /result.
describe('Assessment Cloud (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;

  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = Number(process.env.DB_PORT || 5433);
  const DB_USER = process.env.DB_USER || 'assessment';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'assessment_local_dev';
  const TEST_DB_NAME = 'assessment_test';

  beforeAll(async () => {
    // Crea la base de datos de pruebas si no existe (idempotente).
    const adminClient = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'assessment',
    });
    await adminClient.connect();
    const exists = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DB_NAME],
    );
    if (exists.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    }
    await adminClient.end();

    process.env.DB_HOST = DB_HOST;
    process.env.DB_PORT = String(DB_PORT);
    process.env.DB_USER = DB_USER;
    process.env.DB_PASSWORD = DB_PASSWORD;
    process.env.DB_NAME = TEST_DB_NAME;
    process.env.DB_SSL = 'false';
    process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:4200';
    process.env.EXECUTOR_MODE = 'local';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runPendingMigrations } = require('../src/database/run-migrations');
    await runPendingMigrations();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createApp } = require('../src/bootstrap');
    app = await createApp();
    await app.init();
    httpServer = app.getHttpServer();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('rechaza crear una pregunta CODE con más de 20 test cases', async () => {
    const testCases = Array.from({ length: 21 }, (_, i) => ({
      input: i,
      expectedOutput: String(i),
      hidden: false,
    }));

    await request(httpServer)
      .post('/questions')
      .send({
        title: 'Demasiados casos',
        statement: 'x',
        category: 'javascript',
        difficulty: 'EASY',
        type: 'CODE',
        codeTemplate: 'function solution(n){return n;}',
        testCases,
      })
      .expect(400);
  });

  it('flujo completo: biblioteca -> assessment -> intento -> resolver -> finalizar', async () => {
    // 1. Crear pregunta de opción múltiple
    const mcRes = await request(httpServer)
      .post('/questions')
      .send({
        title: '¿2 + 2?',
        statement: 'Selecciona la respuesta correcta',
        category: 'matemáticas',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false },
        ],
      })
      .expect(201);

    const correctOptionId = mcRes.body.options.find((o: any) => o.isCorrect).id;

    // 2. Crear pregunta de código CON input real (verifica el fix del DTO)
    const codeRes = await request(httpServer)
      .post('/questions')
      .send({
        title: 'Duplicar',
        statement: 'solution(n) retorna el doble de n',
        category: 'javascript',
        difficulty: 'EASY',
        type: 'CODE',
        codeTemplate: 'function solution(n) {\n  // tu código\n}\n',
        testCases: [
          { input: 3, expectedOutput: '6', hidden: false },
          { input: -2, expectedOutput: '-4', hidden: true },
        ],
      })
      .expect(201);

    expect(codeRes.body.testCases[0].input).toBe(3); // el input real no se perdió

    // 3. Crear assessment con ambas preguntas
    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .send({
        name: 'Assessment e2e',
        questionIds: [mcRes.body.id, codeRes.body.id],
      })
      .expect(201);

    // 4. Iniciar intento — la vista debe estar sanitizada
    const attemptRes = await request(httpServer)
      .post('/attempts')
      .send({ assessmentId: assessmentRes.body.id, candidateName: 'E2E Tester' })
      .expect(201);

    const attemptId = attemptRes.body.id;
    const mcQuestion = attemptRes.body.questions.find((q: any) => q.type === 'MULTIPLE_CHOICE');
    const codeQuestion = attemptRes.body.questions.find((q: any) => q.type === 'CODE');

    expect(mcQuestion.options.every((o: any) => o.isCorrect === undefined)).toBe(true);
    expect(codeQuestion.visibleTestCases).toHaveLength(1); // el oculto no viaja al candidato

    // 5. Navegar a /result ANTES de finalizar debe rechazar (bug corregido)
    await request(httpServer).get(`/attempts/${attemptId}/result`).expect(400);

    // 6. Responder la MC correctamente
    await request(httpServer)
      .put(`/attempts/${attemptId}/answers/${mcQuestion.id}`)
      .send({ selectedOptionId: correctOptionId })
      .expect(200);

    // 7. Ejecutar código correcto contra los casos visibles
    const runRes = await request(httpServer)
      .post(`/attempts/${attemptId}/questions/${codeQuestion.id}/run`)
      .send({ code: 'function solution(n) { return String(n * 2); }' })
      .expect(201);

    expect(runRes.body.allPassed).toBe(true);
    expect(runRes.body.results).toHaveLength(1); // solo el visible

    // 8. Finalizar: el score debe incluir el caso oculto (2/2)
    const finishRes = await request(httpServer)
      .post(`/attempts/${attemptId}/finish`)
      .expect(201);

    expect(finishRes.body.score).toBe(2);
    expect(finishRes.body.maxScore).toBe(2);
    expect(finishRes.body.status).toBe('COMPLETED');

    // 9. /result ahora sí responde (lectura pura, sin mutar de nuevo)
    const resultRes = await request(httpServer)
      .get(`/attempts/${attemptId}/result`)
      .expect(200);
    expect(resultRes.body.score).toBe(2);

    // 10. Editar las opciones de la MC no debe dejar opciones huérfanas
    await request(httpServer)
      .put(`/questions/${mcRes.body.id}`)
      .send({
        options: [
          { text: 'cuatro', isCorrect: true },
          { text: 'cinco', isCorrect: false },
          { text: 'seis', isCorrect: false },
        ],
      })
      .expect(200);

    const reloaded = await request(httpServer).get(`/questions/${mcRes.body.id}`).expect(200);
    expect(reloaded.body.options).toHaveLength(3); // no 5 (2 viejas + 3 nuevas)
  });
});
