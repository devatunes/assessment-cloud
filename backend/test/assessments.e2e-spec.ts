import { Client } from 'pg';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// PUT /assessments/:id: edición de config y de la lista de preguntas, y que
// siga respetando el aislamiento cross-tenant ya probado en app.e2e-spec.ts.
describe('Assessments update (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;

  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = Number(process.env.DB_PORT || 5433);
  const DB_USER = process.env.DB_USER || 'assessment';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'assessment_local_dev';
  const TEST_DB_NAME = 'assessment_test';

  let orgAToken: string;
  let orgBToken: string;

  const authed = (token: string) => `Bearer ${token}`;

  async function registerOrganization(suffix: string) {
    const res = await request(httpServer)
      .post('/auth/register-organization')
      .send({
        organizationName: `Assessments E2E Org ${suffix}`,
        adminName: 'Admin E2E',
        email: `assessments-e2e-${suffix}-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);

    return res.body.accessToken as string;
  }

  async function createQuestion(token: string, title: string) {
    const res = await request(httpServer)
      .post('/questions')
      .set('Authorization', authed(token))
      .send({
        title,
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
    return res.body.id as string;
  }

  beforeAll(async () => {
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
    orgBToken = await registerOrganization('b');
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('edita nombre, nivel, tiempo y preguntas de un assessment propio', async () => {
    const q1 = await createQuestion(orgAToken, 'Pregunta 1');
    const q2 = await createQuestion(orgAToken, 'Pregunta 2');

    const createRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', authed(orgAToken))
      .send({ name: 'Assessment original', questionIds: [q1] })
      .expect(201);
    const assessmentId = createRes.body.id;

    const updateRes = await request(httpServer)
      .put(`/assessments/${assessmentId}`)
      .set('Authorization', authed(orgAToken))
      .send({
        name: 'Assessment editado',
        levelThresholds: { junior: 40, semisenior: 70, senior: 90 },
        timeLimitMinutes: 45,
        questionIds: [q1, q2],
      })
      .expect(200);

    expect(updateRes.body.name).toBe('Assessment editado');
    expect(updateRes.body.timeLimitMinutes).toBe(45);
    expect(updateRes.body.levelThresholds).toEqual({ junior: 40, semisenior: 70, senior: 90 });
    expect(updateRes.body.questions).toHaveLength(2);

    // Confirma que quitar una pregunta después también funciona (no deja
    // basura de la fila vieja en assessment_question).
    const secondUpdate = await request(httpServer)
      .put(`/assessments/${assessmentId}`)
      .set('Authorization', authed(orgAToken))
      .send({ questionIds: [q2] })
      .expect(200);
    expect(secondUpdate.body.questions).toHaveLength(1);
    expect(secondUpdate.body.questions[0].questionId).toBe(q2);
  });

  it('rechaza dejar el assessment sin preguntas (ArrayMinSize del DTO)', async () => {
    const q1 = await createQuestion(orgAToken, 'Pregunta sola');
    const createRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', authed(orgAToken))
      .send({ name: 'Assessment con una pregunta', questionIds: [q1] })
      .expect(201);

    await request(httpServer)
      .put(`/assessments/${createRes.body.id}`)
      .set('Authorization', authed(orgAToken))
      .send({ questionIds: [] })
      .expect(400);
  });

  it('fuga cross-tenant: la organización B no puede editar ni referenciar preguntas de la organización A', async () => {
    const qA = await createQuestion(orgAToken, 'Pregunta de A');
    const createRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', authed(orgAToken))
      .send({ name: 'Assessment de A', questionIds: [qA] })
      .expect(201);

    // Org B no ve el assessment de A (404, no 403: no revela que existe).
    await request(httpServer)
      .put(`/assessments/${createRes.body.id}`)
      .set('Authorization', authed(orgBToken))
      .send({ name: 'Intento de secuestro' })
      .expect(404);

    // Org B tampoco puede anexar la pregunta privada de A a su propio assessment.
    const qB = await createQuestion(orgBToken, 'Pregunta de B');
    const ownAssessment = await request(httpServer)
      .post('/assessments')
      .set('Authorization', authed(orgBToken))
      .send({ name: 'Assessment de B', questionIds: [qB] })
      .expect(201);

    await request(httpServer)
      .put(`/assessments/${ownAssessment.body.id}`)
      .set('Authorization', authed(orgBToken))
      .send({ questionIds: [qB, qA] })
      .expect(400);
  });
});
