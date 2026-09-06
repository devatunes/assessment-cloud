import { Client } from 'pg';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Flujo de candidato + simulacro: registro/login separado del staff de
// organización, catálogo público de simulacros, iniciar/retomar un intento
// de práctica, historial propio, y las dos fronteras de privacidad/aislamiento
// que sostienen todo esto: un token de candidato no sirve contra endpoints
// de organización (y viceversa), y el historial de práctica nunca mezcla
// intentos oficiales vía invitación (esos jamás tienen candidateId).
describe('Practice (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;

  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = Number(process.env.DB_PORT || 5433);
  const DB_USER = process.env.DB_USER || 'assessment';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'assessment_local_dev';
  const TEST_DB_NAME = 'assessment_test';

  let orgToken: string;

  beforeAll(async () => {
    const adminClient = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'assessment',
    });
    await adminClient.connect();
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      TEST_DB_NAME,
    ]);
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
    process.env.CANDIDATE_JWT_AUDIENCE = 'assessment-cloud-candidates';
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

    const registerRes = await request(httpServer)
      .post('/auth/register-organization')
      .send({
        organizationName: 'Practice E2E Org',
        adminName: 'Admin',
        email: `practice-e2e-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);
    orgToken = registerRes.body.accessToken;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('flujo completo: candidato se registra -> ve el catálogo -> practica -> ve su historial', async () => {
    const orgAuth = `Bearer ${orgToken}`;

    // 1. La organización crea una pregunta y marca un assessment como PRACTICE
    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', orgAuth)
      .send({
        title: '¿2 + 2?',
        statement: 'x',
        category: 'BACKEND',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false },
        ],
      })
      .expect(201);

    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', orgAuth)
      .send({
        name: 'Simulacro de práctica',
        questionIds: [questionRes.body.id],
        visibility: 'PRACTICE',
        levelThresholds: { junior: 1 },
      })
      .expect(201);

    // 2. Un candidato se registra por su cuenta (sin invitación)
    const candidateEmail = `candidato-e2e-${Date.now()}@example.com`;
    const candidateRegisterRes = await request(httpServer)
      .post('/candidate-auth/register')
      .send({ name: 'Candidato Libre', email: candidateEmail, password: 'password123' })
      .expect(201);

    const candidateToken = candidateRegisterRes.body.accessToken;
    const candidateAuth = `Bearer ${candidateToken}`;
    expect(candidateRegisterRes.body.candidate.email).toBe(candidateEmail);

    // 3. Ve el catálogo público de simulacros (incluye el que creó otra org)
    const catalogRes = await request(httpServer)
      .get('/practice/assessments')
      .set('Authorization', candidateAuth)
      .expect(200);
    const catalogEntry = catalogRes.body.items.find((a: any) => a.id === assessmentRes.body.id);
    expect(catalogEntry).toBeDefined();
    expect(catalogEntry.questionCount).toBe(1);

    // 4. Inicia el simulacro (queda estampado con su candidateId)
    const startRes = await request(httpServer)
      .post(`/practice/assessments/${assessmentRes.body.id}/start`)
      .set('Authorization', candidateAuth)
      .expect(201);
    const attemptId = startRes.body.id;
    expect(startRes.body.candidateName).toBe('Candidato Libre');

    // 5. Reintentar "start" mientras sigue IN_PROGRESS retoma el mismo attempt
    const resumeRes = await request(httpServer)
      .post(`/practice/assessments/${assessmentRes.body.id}/start`)
      .set('Authorization', candidateAuth)
      .expect(201);
    expect(resumeRes.body.id).toBe(attemptId);

    // 6. Responde y finaliza (los endpoints de /attempts son públicos, no
    // requieren el guard de candidato: el attemptId ya es la credencial)
    const questionId = startRes.body.questions[0].id;
    const correctOptionId = questionRes.body.options.find((o: any) => o.isCorrect).id;

    await request(httpServer)
      .put(`/attempts/${attemptId}/answers/${questionId}`)
      .send({ selectedOptionId: correctOptionId })
      .expect(200);
    await request(httpServer).post(`/attempts/${attemptId}/finish`).expect(201);

    // 7. Su historial muestra el intento completado con nivel calculado
    const historyRes = await request(httpServer)
      .get('/practice/my-attempts')
      .set('Authorization', candidateAuth)
      .expect(200);
    expect(historyRes.body.items).toHaveLength(1);
    expect(historyRes.body.items[0].id).toBe(attemptId);
    expect(historyRes.body.items[0].status).toBe('COMPLETED');
    expect(historyRes.body.items[0].level).toBe('JUNIOR');

    // 8. Tras COMPLETED, un nuevo "start" arranca un intento NUEVO (a
    // diferencia de las invitaciones oficiales, la práctica sí permite reintentar)
    const retryRes = await request(httpServer)
      .post(`/practice/assessments/${assessmentRes.body.id}/start`)
      .set('Authorization', candidateAuth)
      .expect(201);
    expect(retryRes.body.id).not.toBe(attemptId);
  });

  it('otorga insignias al completar simulacros de práctica (primera vez, puntaje perfecto, nivel, y racha de 5)', async () => {
    const orgAuth = `Bearer ${orgToken}`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', orgAuth)
      .send({
        title: '¿3 + 3?',
        statement: 'x',
        category: 'BACKEND',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: '6', isCorrect: true },
          { text: '7', isCorrect: false },
        ],
      })
      .expect(201);

    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', orgAuth)
      .send({
        name: 'Simulacro de insignias',
        questionIds: [questionRes.body.id],
        visibility: 'PRACTICE',
        levelThresholds: { junior: 1 },
      })
      .expect(201);

    const candidateRes = await request(httpServer)
      .post('/candidate-auth/register')
      .send({
        name: 'Candidato Insignias',
        email: `candidato-insignias-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);
    const candidateAuth = `Bearer ${candidateRes.body.accessToken}`;
    const correctOptionId = questionRes.body.options.find((o: any) => o.isCorrect).id;

    let lastFinishBody: any;
    for (let i = 0; i < 5; i++) {
      const startRes = await request(httpServer)
        .post(`/practice/assessments/${assessmentRes.body.id}/start`)
        .set('Authorization', candidateAuth)
        .expect(201);
      const attemptId = startRes.body.id;
      const questionId = startRes.body.questions[0].id;

      await request(httpServer)
        .put(`/attempts/${attemptId}/answers/${questionId}`)
        .send({ selectedOptionId: correctOptionId })
        .expect(200);

      const finishRes = await request(httpServer).post(`/attempts/${attemptId}/finish`).expect(201);
      lastFinishBody = finishRes.body;
    }

    // El PRIMER finish ya otorgó FIRST_ATTEMPT_COMPLETED + PERFECT_SCORE +
    // LEVEL_JUNIOR de una sola vez; el QUINTO otorga MILESTONE_5_ATTEMPTS.
    const newBadgeCodes = lastFinishBody.newBadges.map((b: any) => b.code);
    expect(newBadgeCodes).toEqual(['MILESTONE_5_ATTEMPTS']);

    const badgesRes = await request(httpServer)
      .get('/practice/my-badges')
      .set('Authorization', candidateAuth)
      .expect(200);
    const allCodes = badgesRes.body.map((b: any) => b.code).sort();
    expect(allCodes).toEqual(
      ['FIRST_ATTEMPT_COMPLETED', 'LEVEL_JUNIOR', 'MILESTONE_5_ATTEMPTS', 'PERFECT_SCORE'].sort(),
    );
    // Cada insignia se otorga una única vez, aunque las condiciones se
    // repitan en varios intentos (puntaje perfecto y nivel Junior se
    // cumplieron los 5 intentos, pero solo aparecen una vez en el listado).
    expect(badgesRes.body).toHaveLength(4);
  });

  it('un token de candidato no da acceso a endpoints de organización, y viceversa', async () => {
    const candidateRes = await request(httpServer)
      .post('/candidate-auth/register')
      .send({
        name: 'Otro Candidato',
        email: `candidato-aislado-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);
    const candidateAuth = `Bearer ${candidateRes.body.accessToken}`;
    const orgAuth = `Bearer ${orgToken}`;

    // El token de candidato no sirve para leer preguntas de una organización
    await request(httpServer).get('/questions').set('Authorization', candidateAuth).expect(401);

    // El token de organización no sirve para el catálogo de práctica
    await request(httpServer).get('/practice/assessments').set('Authorization', orgAuth).expect(401);

    // Sin ningún token, ambos rechazan
    await request(httpServer).get('/practice/assessments').expect(401);
    await request(httpServer).get('/questions').expect(401);
  });

  it('no permite iniciar un simulacro sobre un assessment OFFICIAL (no es de acceso libre)', async () => {
    const orgAuth = `Bearer ${orgToken}`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', orgAuth)
      .send({
        title: 'Pregunta oficial',
        statement: 'x',
        category: 'BACKEND',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: 'a', isCorrect: true },
          { text: 'b', isCorrect: false },
        ],
      })
      .expect(201);

    const officialAssessment = await request(httpServer)
      .post('/assessments')
      .set('Authorization', orgAuth)
      .send({ name: 'Oficial, no simulacro', questionIds: [questionRes.body.id] })
      .expect(201);

    const candidateRes = await request(httpServer)
      .post('/candidate-auth/register')
      .send({
        name: 'Candidato Curioso',
        email: `candidato-curioso-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);

    await request(httpServer)
      .post(`/practice/assessments/${officialAssessment.body.id}/start`)
      .set('Authorization', `Bearer ${candidateRes.body.accessToken}`)
      .expect(404);
  });
});
