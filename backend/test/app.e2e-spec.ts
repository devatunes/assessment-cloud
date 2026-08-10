import { Client } from 'pg';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Prueba de flujo completo contra un Postgres real (docker-compose db,
// puerto 5433) y una base de datos dedicada ("assessment_test") para no
// tocar los datos de desarrollo. Cubre el camino feliz completo
// (registro -> login -> biblioteca -> assessment -> intento -> responder ->
// ejecutar -> finalizar) y los bugs corregidos: validación de test cases con
// input real, tope de test cases, opciones huérfanas al editar, el guard de
// /result, y la fuga cross-tenant entre organizaciones.
describe('Assessment Cloud (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;

  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = Number(process.env.DB_PORT || 5433);
  const DB_USER = process.env.DB_USER || 'assessment';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'assessment_local_dev';
  const TEST_DB_NAME = 'assessment_test';

  // Token de la organización principal usada en el flujo feliz (registrada
  // una sola vez en beforeAll para no pagar el costo de bcrypt en cada test).
  let orgAToken: string;

  const authed = (token: string) => `Bearer ${token}`;

  async function registerOrganization(suffix: string) {
    const res = await request(httpServer)
      .post('/auth/register-organization')
      .send({
        organizationName: `E2E Org ${suffix}`,
        adminName: 'Admin E2E',
        email: `admin-${suffix}-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);

    return res.body.accessToken as string;
  }

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
    process.env.JWT_SECRET = 'e2e-test-secret';
    process.env.JWT_ISSUER = 'assessment-cloud-api';
    process.env.JWT_AUDIENCE = 'assessment-cloud-org';
    // Sin SEED_ADMIN_EMAIL/PASSWORD a propósito: este spec no depende del
    // bootstrap automático, cada test registra su propia organización.
    delete process.env.SEED_ADMIN_EMAIL;
    delete process.env.SEED_ADMIN_PASSWORD;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runPendingMigrations } = require('../src/database/run-migrations');
    await runPendingMigrations();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createApp } = require('../src/bootstrap');
    app = await createApp();
    await app.init();
    httpServer = app.getHttpServer();

    orgAToken = await registerOrganization('a');
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('rechaza acceder a /questions sin token', async () => {
    await request(httpServer).get('/questions').expect(401);
  });

  it('rechaza crear una pregunta CODE con más de 20 test cases', async () => {
    const testCases = Array.from({ length: 21 }, (_, i) => ({
      input: i,
      expectedOutput: String(i),
      hidden: false,
    }));

    await request(httpServer)
      .post('/questions')
      .set('Authorization', authed(orgAToken))
      .send({
        title: 'Demasiados casos',
        statement: 'x',
        category: 'FULLSTACK',
        difficulty: 'EASY',
        type: 'CODE',
        codeTemplate: 'function solution(n){return n;}',
        testCases,
      })
      .expect(400);
  });

  it('flujo completo: registro -> login -> biblioteca -> assessment -> intento -> resolver -> finalizar', async () => {
    // 1. Crear pregunta de opción múltiple
    const mcRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', authed(orgAToken))
      .send({
        title: '¿2 + 2?',
        statement: 'Selecciona la respuesta correcta',
        category: 'BACKEND',
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
      .set('Authorization', authed(orgAToken))
      .send({
        title: 'Duplicar',
        statement: 'solution(n) retorna el doble de n',
        category: 'FULLSTACK',
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

    // 3. Crear assessment con ambas preguntas y niveles configurados
    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', authed(orgAToken))
      .send({
        name: 'Assessment e2e',
        questionIds: [mcRes.body.id, codeRes.body.id],
        levelThresholds: { junior: 1, semisenior: 50, senior: 100 },
      })
      .expect(201);

    // 4. Iniciar intento (endpoint público — el candidato nunca tiene cuenta)
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

    // 7b. Retomar el intento (recargar la página / reabrir en otro momento)
    // debe traer de vuelta lo ya respondido, no en blanco (bug corregido).
    const resumedRes = await request(httpServer).get(`/attempts/${attemptId}`).expect(200);
    const resumedMc = resumedRes.body.questions.find((q: any) => q.type === 'MULTIPLE_CHOICE');
    const resumedCode = resumedRes.body.questions.find((q: any) => q.type === 'CODE');
    expect(resumedMc.selectedOptionId).toBe(correctOptionId);
    expect(resumedCode.submittedCode).toBe('function solution(n) { return String(n * 2); }');

    // 8. Finalizar: el score debe incluir el caso oculto (2/2) y el nivel SENIOR (100%)
    const finishRes = await request(httpServer)
      .post(`/attempts/${attemptId}/finish`)
      .expect(201);

    expect(finishRes.body.score).toBe(2);
    expect(finishRes.body.maxScore).toBe(2);
    expect(finishRes.body.status).toBe('COMPLETED');
    expect(finishRes.body.level).toBe('SENIOR');

    // 9. /result ahora sí responde (lectura pura, sin mutar de nuevo)
    const resultRes = await request(httpServer)
      .get(`/attempts/${attemptId}/result`)
      .expect(200);
    expect(resultRes.body.score).toBe(2);
    expect(resultRes.body.level).toBe('SENIOR');

    // 10. Editar las opciones de la MC no debe dejar opciones huérfanas
    await request(httpServer)
      .put(`/questions/${mcRes.body.id}`)
      .set('Authorization', authed(orgAToken))
      .send({
        options: [
          { text: 'cuatro', isCorrect: true },
          { text: 'cinco', isCorrect: false },
          { text: 'seis', isCorrect: false },
        ],
      })
      .expect(200);

    const reloaded = await request(httpServer)
      .get(`/questions/${mcRes.body.id}`)
      .set('Authorization', authed(orgAToken))
      .expect(200);
    expect(reloaded.body.options).toHaveLength(3); // no 5 (2 viejas + 3 nuevas)
  });

  it('login con credenciales correctas devuelve un token válido para /questions', async () => {
    const email = `login-${Date.now()}@example.com`;
    await request(httpServer)
      .post('/auth/register-organization')
      .send({
        organizationName: 'Login Org',
        adminName: 'Admin Login',
        email,
        password: 'password123',
      })
      .expect(201);

    const loginRes = await request(httpServer)
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);

    expect(loginRes.body.accessToken).toBeDefined();

    await request(httpServer)
      .get('/questions')
      .set('Authorization', authed(loginRes.body.accessToken))
      .expect(200);
  });

  it('login con contraseña incorrecta rechaza con 401', async () => {
    const email = `login-fail-${Date.now()}@example.com`;
    await request(httpServer)
      .post('/auth/register-organization')
      .send({
        organizationName: 'Login Fail Org',
        adminName: 'Admin',
        email,
        password: 'password123',
      })
      .expect(201);

    await request(httpServer)
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('fuga cross-tenant: la organización B no ve ni puede referenciar preguntas de la organización A', async () => {
    const orgBToken = await registerOrganization('b');

    // Pregunta creada por la organización A.
    const orgAQuestion = await request(httpServer)
      .post('/questions')
      .set('Authorization', authed(orgAToken))
      .send({
        title: 'Pregunta privada de Org A',
        statement: 'x',
        category: 'FULLSTACK',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: 'a', isCorrect: true },
          { text: 'b', isCorrect: false },
        ],
      })
      .expect(201);

    // Org B no puede leerla directamente (404, no 403: no revela que existe).
    await request(httpServer)
      .get(`/questions/${orgAQuestion.body.id}`)
      .set('Authorization', authed(orgBToken))
      .expect(404);

    // Org B no puede anexarla a un assessment propio.
    await request(httpServer)
      .post('/assessments')
      .set('Authorization', authed(orgBToken))
      .send({ name: 'Assessment de Org B', questionIds: [orgAQuestion.body.id] })
      .expect(400);

    // La biblioteca de Org B no incluye la pregunta de Org A.
    const orgBQuestions = await request(httpServer)
      .get('/questions')
      .set('Authorization', authed(orgBToken))
      .expect(200);
    expect(orgBQuestions.body.find((q: any) => q.id === orgAQuestion.body.id)).toBeUndefined();
  });
});
