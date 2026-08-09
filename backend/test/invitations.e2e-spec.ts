import { Client } from 'pg';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Flujo de invitaciones oficiales de punta a punta: generar el link,
// aterrizar sin sesión, iniciar, retomar a mitad de intento, y confirmar
// que reabrir después de completado no vuelve a crear un attempt.
describe('Invitations (e2e)', () => {
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
        organizationName: 'Invitations E2E Org',
        adminName: 'Admin',
        email: `invitations-e2e-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);
    orgToken = registerRes.body.accessToken;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('flujo completo de invitación: generar -> aterrizar -> iniciar -> retomar -> completar', async () => {
    const auth = `Bearer ${orgToken}`;

    // 1. Reclutador crea una pregunta y un assessment OFFICIAL
    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: '¿1 + 1?',
        statement: 'x',
        category: 'BACKEND',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: '2', isCorrect: true },
          { text: '3', isCorrect: false },
        ],
      })
      .expect(201);

    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', auth)
      .send({ name: 'Assessment con invitación', questionIds: [questionRes.body.id] })
      .expect(201);

    // 2. Genera la invitación
    const invitationRes = await request(httpServer)
      .post(`/assessments/${assessmentRes.body.id}/invitations`)
      .set('Authorization', auth)
      .send({ candidateEmail: 'candidato@example.com' })
      .expect(201);

    expect(invitationRes.body.status).toBe('PENDING');
    const token = invitationRes.body.token;

    // 3. El candidato aterriza SIN sesión (endpoint público)
    const landingRes = await request(httpServer).get(`/invitations/${token}`).expect(200);
    expect(landingRes.body.status).toBe('PENDING');
    expect(landingRes.body.assessmentName).toBe('Assessment con invitación');
    // Nunca debe filtrar datos de la organización al candidato.
    expect(landingRes.body.organizationId).toBeUndefined();

    // 4. Inicia el intento (público)
    const startRes = await request(httpServer)
      .post(`/invitations/${token}/start`)
      .send({ candidateName: 'Candidato Invitado' })
      .expect(201);

    const attemptId = startRes.body.id;
    expect(attemptId).toBeDefined();

    // La invitación ahora está STARTED
    const afterStart = await request(httpServer).get(`/invitations/${token}`).expect(200);
    expect(afterStart.body.status).toBe('STARTED');
    expect(afterStart.body.attemptId).toBe(attemptId);

    // 5. Reabrir el link a mitad de intento RETOMA el mismo attempt (no crea otro)
    const resumeRes = await request(httpServer)
      .post(`/invitations/${token}/start`)
      .send({ candidateName: 'Nombre ignorado en el resume' })
      .expect(201);
    expect(resumeRes.body.id).toBe(attemptId);

    // 6. El candidato completa el assessment
    const questionId = startRes.body.questions[0].id;
    const correctOptionId = questionRes.body.options.find((o: any) => o.isCorrect).id;

    await request(httpServer)
      .put(`/attempts/${attemptId}/answers/${questionId}`)
      .send({ selectedOptionId: correctOptionId })
      .expect(200);

    await request(httpServer).post(`/attempts/${attemptId}/finish`).expect(201);

    // 7. La invitación quedó COMPLETED automáticamente (AttemptsService.finish)
    const afterFinish = await request(httpServer).get(`/invitations/${token}`).expect(200);
    expect(afterFinish.body.status).toBe('COMPLETED');

    // 8. Reabrir después de completado sigue retomando el mismo attempt (no lo reinicia)
    const finalStart = await request(httpServer)
      .post(`/invitations/${token}/start`)
      .send({ candidateName: 'x' })
      .expect(201);
    expect(finalStart.body.id).toBe(attemptId);
    expect(finalStart.body.status).toBe('COMPLETED');
  });

  it('rechaza generar una invitación para un assessment PRACTICE (simulacro es de acceso libre)', async () => {
    const auth = `Bearer ${orgToken}`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: 'Pregunta simulacro',
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

    const practiceAssessment = await request(httpServer)
      .post('/assessments')
      .set('Authorization', auth)
      .send({
        name: 'Simulacro',
        questionIds: [questionRes.body.id],
        visibility: 'PRACTICE',
      })
      .expect(201);

    await request(httpServer)
      .post(`/assessments/${practiceAssessment.body.id}/invitations`)
      .set('Authorization', auth)
      .send({})
      .expect(400);
  });

  it('un token inexistente responde 404 en la landing pública', async () => {
    await request(httpServer).get('/invitations/token-que-no-existe').expect(404);
  });

  it('vincula el intento oficial a la cuenta del candidato si está logueado al abrir la invitación', async () => {
    const auth = `Bearer ${orgToken}`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: 'Pregunta vínculo candidato',
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

    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', auth)
      .send({ name: 'Assessment con candidato logueado', questionIds: [questionRes.body.id] })
      .expect(201);

    const invitationRes = await request(httpServer)
      .post(`/assessments/${assessmentRes.body.id}/invitations`)
      .set('Authorization', auth)
      .send({})
      .expect(201);

    const candidateRes = await request(httpServer)
      .post('/candidate-auth/register')
      .send({
        name: 'Candidato Con Cuenta',
        email: `candidato-vinculado-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);
    const candidateAuth = `Bearer ${candidateRes.body.accessToken}`;

    // Abre la invitación CON su token de candidato (a diferencia del resto
    // de tests de este archivo, que la abren de forma anónima)
    const startRes = await request(httpServer)
      .post(`/invitations/${invitationRes.body.token}/start`)
      .set('Authorization', candidateAuth)
      .send({ candidateName: 'Candidato Con Cuenta' })
      .expect(201);
    const attemptId = startRes.body.id;

    const correctOptionId = questionRes.body.options.find((o: any) => o.isCorrect).id;
    await request(httpServer)
      .put(`/attempts/${attemptId}/answers/${questionRes.body.id}`)
      .send({ selectedOptionId: correctOptionId })
      .expect(200);
    await request(httpServer).post(`/attempts/${attemptId}/finish`).expect(201);

    // Aparece en su historial de candidato, marcado como OFFICIAL (no PRACTICE)
    const historyRes = await request(httpServer)
      .get('/practice/my-attempts')
      .set('Authorization', candidateAuth)
      .expect(200);
    expect(historyRes.body).toHaveLength(1);
    expect(historyRes.body[0].id).toBe(attemptId);
    expect(historyRes.body[0].assessmentVisibility).toBe('OFFICIAL');
    expect(historyRes.body[0].status).toBe('COMPLETED');

    // Y sigue apareciendo en el reporte de la organización (la vinculación
    // a la cuenta del candidato no le quita visibilidad al reclutador)
    const reportRes = await request(httpServer)
      .get(`/assessments/${assessmentRes.body.id}/report`)
      .set('Authorization', auth)
      .expect(200);
    expect(reportRes.body.completed).toBe(1);
  });

  it('abrir una invitación sin token sigue funcionando igual (regresión: no exige cuenta de candidato)', async () => {
    const auth = `Bearer ${orgToken}`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: 'Pregunta anónima',
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

    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', auth)
      .send({ name: 'Assessment anónimo', questionIds: [questionRes.body.id] })
      .expect(201);

    const invitationRes = await request(httpServer)
      .post(`/assessments/${assessmentRes.body.id}/invitations`)
      .set('Authorization', auth)
      .send({})
      .expect(201);

    const startRes = await request(httpServer)
      .post(`/invitations/${invitationRes.body.token}/start`)
      .send({ candidateName: 'Anónimo de siempre' })
      .expect(201);

    expect(startRes.body.candidateName).toBe('Anónimo de siempre');
  });

  it('crea una invitación con track/especialidad y permite reasignarlos después', async () => {
    const auth = `Bearer ${orgToken}`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: 'Pregunta track',
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

    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', auth)
      .send({ name: 'Assessment con track', questionIds: [questionRes.body.id] })
      .expect(201);

    const invitationRes = await request(httpServer)
      .post(`/assessments/${assessmentRes.body.id}/invitations`)
      .set('Authorization', auth)
      .send({ candidateEmail: 'track@example.com', track: 'DEVELOPER', specialty: 'Backend' })
      .expect(201);
    expect(invitationRes.body.track).toBe('DEVELOPER');
    expect(invitationRes.body.specialty).toBe('Backend');

    const updateRes = await request(httpServer)
      .patch(`/assessments/${assessmentRes.body.id}/invitations/${invitationRes.body.id}`)
      .set('Authorization', auth)
      .send({ track: 'QA', specialty: 'Automation' })
      .expect(200);
    expect(updateRes.body.track).toBe('QA');
    expect(updateRes.body.specialty).toBe('Automation');
  });
});
