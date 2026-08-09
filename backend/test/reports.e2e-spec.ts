import { Client } from 'pg';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Reportes de organización: reporte por assessment (candidatos, niveles,
// acierto por pregunta), su export CSV, el dashboard "overview" agrupado
// por categoría, y las dos fronteras que lo sostienen: la práctica libre
// NUNCA genera reporte de organización, y un assessment de otra org da 404
// (mismo patrón de aislamiento multi-tenant ya probado en app.e2e-spec).
describe('Reports (e2e)', () => {
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
        organizationName: 'Reports E2E Org',
        adminName: 'Admin',
        email: `reports-e2e-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);
    orgToken = registerRes.body.accessToken;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('reporte de assessment: candidatos, niveles, acierto por pregunta, y su CSV', async () => {
    const auth = `Bearer ${orgToken}`;

    const backendQuestion = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: 'Pregunta Backend',
        statement: 'x',
        category: 'BACKEND',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: 'correcta', isCorrect: true },
          { text: 'incorrecta', isCorrect: false },
        ],
      })
      .expect(201);

    const frontendQuestion = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: 'Pregunta Frontend',
        statement: 'x',
        category: 'FRONTEND',
        difficulty: 'EASY',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: 'correcta', isCorrect: true },
          { text: 'incorrecta', isCorrect: false },
        ],
      })
      .expect(201);

    const assessmentRes = await request(httpServer)
      .post('/assessments')
      .set('Authorization', auth)
      .send({
        name: 'Assessment con reporte',
        questionIds: [backendQuestion.body.id, frontendQuestion.body.id],
        levelThresholds: { junior: 1, semisenior: 60 },
      })
      .expect(201);
    const assessmentId = assessmentRes.body.id;

    // Candidato 1: completa, acierta backend, falla frontend -> 50%, JUNIOR
    const inv1 = await request(httpServer)
      .post(`/assessments/${assessmentId}/invitations`)
      .set('Authorization', auth)
      .send({ candidateEmail: 'candidato1@example.com' })
      .expect(201);

    const start1 = await request(httpServer)
      .post(`/invitations/${inv1.body.token}/start`)
      .send({ candidateName: 'Candidato Uno' })
      .expect(201);

    const backendOptionCorrect = backendQuestion.body.options.find((o: any) => o.isCorrect).id;
    const frontendOptionWrong = frontendQuestion.body.options.find((o: any) => !o.isCorrect).id;

    await request(httpServer)
      .put(`/attempts/${start1.body.id}/answers/${backendQuestion.body.id}`)
      .send({ selectedOptionId: backendOptionCorrect })
      .expect(200);
    await request(httpServer)
      .put(`/attempts/${start1.body.id}/answers/${frontendQuestion.body.id}`)
      .send({ selectedOptionId: frontendOptionWrong })
      .expect(200);
    await request(httpServer).post(`/attempts/${start1.body.id}/finish`).expect(201);

    // Candidato 2: invitado pero nunca empieza (queda PENDING)
    await request(httpServer)
      .post(`/assessments/${assessmentId}/invitations`)
      .set('Authorization', auth)
      .send({ candidateEmail: 'candidato2@example.com' })
      .expect(201);

    const reportRes = await request(httpServer)
      .get(`/assessments/${assessmentId}/report`)
      .set('Authorization', auth)
      .expect(200);

    expect(reportRes.body.totalInvitations).toBe(2);
    expect(reportRes.body.completed).toBe(1);
    expect(reportRes.body.completionRate).toBe(50);
    expect(reportRes.body.averageScorePercentage).toBe(50);
    expect(reportRes.body.levelDistribution).toEqual([{ level: 'JUNIOR', count: 1 }]);

    const backendStat = reportRes.body.questionStats.find((s: any) => s.category === 'BACKEND');
    const frontendStat = reportRes.body.questionStats.find((s: any) => s.category === 'FRONTEND');
    expect(backendStat.correctRate).toBe(100);
    expect(frontendStat.correctRate).toBe(0);

    expect(reportRes.body.candidates).toHaveLength(2);
    const completedRow = reportRes.body.candidates.find((c: any) => c.status === 'COMPLETED');
    expect(completedRow.candidateName).toBe('Candidato Uno');
    expect(completedRow.level).toBe('JUNIOR');
    const pendingRow = reportRes.body.candidates.find((c: any) => c.status === 'PENDING');
    expect(pendingRow.score).toBeNull();

    // CSV: mismo dato, formato descargable
    const csvRes = await request(httpServer)
      .get(`/assessments/${assessmentId}/report/export.csv`)
      .set('Authorization', auth)
      .expect(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.headers['content-disposition']).toContain('attachment');
    expect(csvRes.text).toContain('Candidato Uno');
    expect(csvRes.text).toContain('JUNIOR');

    // Overview: el assessment aparece agregado, y la categoría BACKEND tiene
    // mejor acierto que FRONTEND
    const overviewRes = await request(httpServer)
      .get('/reports/overview')
      .set('Authorization', auth)
      .expect(200);
    const overviewEntry = overviewRes.body.assessments.find((a: any) => a.assessmentId === assessmentId);
    expect(overviewEntry.completed).toBe(1);
    expect(overviewEntry.totalInvitations).toBe(2);

    const backendCategory = overviewRes.body.categoryBreakdown.find((c: any) => c.category === 'BACKEND');
    const frontendCategory = overviewRes.body.categoryBreakdown.find((c: any) => c.category === 'FRONTEND');
    expect(backendCategory.correctRate).toBe(100);
    expect(frontendCategory.correctRate).toBe(0);
  });

  it('rechaza el reporte de un assessment PRACTICE (la práctica libre es privada del candidato)', async () => {
    const auth = `Bearer ${orgToken}`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: 'Pregunta simulacro',
        statement: 'x',
        category: 'QA',
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
      .send({ name: 'Simulacro sin reporte', questionIds: [questionRes.body.id], visibility: 'PRACTICE' })
      .expect(201);

    await request(httpServer)
      .get(`/assessments/${practiceAssessment.body.id}/report`)
      .set('Authorization', auth)
      .expect(400);
  });

  it('un assessment de otra organización responde 404 (aislamiento multi-tenant)', async () => {
    const otherOrgRes = await request(httpServer)
      .post('/auth/register-organization')
      .send({
        organizationName: 'Otra Org Reports',
        adminName: 'Admin Otra',
        email: `otra-org-reports-${Date.now()}@example.com`,
        password: 'password123',
      })
      .expect(201);
    const otherOrgAuth = `Bearer ${otherOrgRes.body.accessToken}`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        title: 'Pregunta org A',
        statement: 'x',
        category: 'DATA',
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
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Assessment de la org A', questionIds: [questionRes.body.id] })
      .expect(201);

    await request(httpServer)
      .get(`/assessments/${assessmentRes.body.id}/report`)
      .set('Authorization', otherOrgAuth)
      .expect(404);
  });

  it('historial de candidatos: agrupa por correo a través de varios assessments y filtra por track', async () => {
    const auth = `Bearer ${orgToken}`;
    const candidateEmail = `historial-${Date.now()}@example.com`;

    const questionRes = await request(httpServer)
      .post('/questions')
      .set('Authorization', auth)
      .send({
        title: 'Pregunta historial',
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

    // Dos assessments distintos ("dos convocatorias"), mismo candidato, tracks distintos
    const assessment1 = await request(httpServer)
      .post('/assessments')
      .set('Authorization', auth)
      .send({ name: 'Convocatoria Backend', questionIds: [questionRes.body.id] })
      .expect(201);
    const assessment2 = await request(httpServer)
      .post('/assessments')
      .set('Authorization', auth)
      .send({ name: 'Convocatoria QA', questionIds: [questionRes.body.id] })
      .expect(201);

    await request(httpServer)
      .post(`/assessments/${assessment1.body.id}/invitations`)
      .set('Authorization', auth)
      .send({ candidateEmail, candidateName: 'Candidato Historial', track: 'DEVELOPER', specialty: 'Backend' })
      .expect(201);
    await request(httpServer)
      .post(`/assessments/${assessment2.body.id}/invitations`)
      .set('Authorization', auth)
      .send({ candidateEmail, candidateName: 'Candidato Historial', track: 'QA', specialty: 'Automation' })
      .expect(201);

    // Otro candidato, no debe mezclarse en el grupo del primero
    await request(httpServer)
      .post(`/assessments/${assessment1.body.id}/invitations`)
      .set('Authorization', auth)
      .send({ candidateEmail: `otro-${Date.now()}@example.com`, track: 'DEVELOPER', specialty: 'Frontend' })
      .expect(201);

    const historyRes = await request(httpServer)
      .get('/reports/candidates')
      .set('Authorization', auth)
      .expect(200);

    const group = historyRes.body.find((g: any) => g.email === candidateEmail);
    expect(group).toBeDefined();
    expect(group.entries).toHaveLength(2);
    expect(group.name).toBe('Candidato Historial');
    const tracks = group.entries.map((e: any) => e.track).sort();
    expect(tracks).toEqual(['DEVELOPER', 'QA']);

    // Filtro por track: solo trae la entrada QA de este candidato
    const filteredRes = await request(httpServer)
      .get('/reports/candidates?track=QA')
      .set('Authorization', auth)
      .expect(200);
    const filteredGroup = filteredRes.body.find((g: any) => g.email === candidateEmail);
    expect(filteredGroup.entries).toHaveLength(1);
    expect(filteredGroup.entries[0].track).toBe('QA');
    expect(filteredGroup.entries[0].specialty).toBe('Automation');
  });
});
