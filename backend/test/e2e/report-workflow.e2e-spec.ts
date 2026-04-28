import { INestApplication } from '@nestjs/common';
import { buildTestApp, api, seedTestInstitution } from '../helpers/test-app.helper';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * E2E — Full report card workflow:
 * Admin creates class → subject → student → report → grades → submit → publish
 */
describe('Report Card Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let institutionId: string;
  let teacherToken: string;

  let classId: string;
  let subjectId: string;
  let studentId: string;
  let reportId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    prisma = app.get(PrismaService);

    ({ accessToken: adminToken, institutionId } = await seedTestInstitution(app));

    // Create a teacher user
    const teacherRes = await api(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Teacher E2E',
        email: `teacher-${Date.now()}@e2e.tg`,
        password: 'Teacher@123',
        role: 'TEACHER',
      });

    // Log in as teacher
    const loginRes = await api(app)
      .post('/api/auth/login')
      .send({ email: teacherRes.body.data.email, password: 'Teacher@123' });
    teacherToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Step 1: Create a class ──────────────────────────────────────────────

  it('Step 1 — Admin creates a class', async () => {
    const res = await api(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '6ème E2E',
        level: '6eme',
        academicYear: '2024-2025',
        capacity: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('6ème E2E');
    classId = res.body.data.id;
  });

  // ─── Step 2: Create a subject ────────────────────────────────────────────

  it('Step 2 — Admin creates a subject', async () => {
    const res = await api(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nameFr: 'Mathématiques',
        nameEn: 'Mathematics',
        code: `MATH-${Date.now()}`,
        passMark: 10,
      });

    expect(res.status).toBe(201);
    subjectId = res.body.data.id;
  });

  // ─── Step 3: Assign subject to class ────────────────────────────────────

  it('Step 3 — Admin assigns subject to class', async () => {
    const res = await api(app)
      .post(`/api/classes/${classId}/subjects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subjectId });

    expect(res.status).toBe(201);
  });

  // ─── Step 4: Create a student ────────────────────────────────────────────

  it('Step 4 — Admin creates a student', async () => {
    const res = await api(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: `E2E-${Date.now()}`,
        name: 'Ama E2E',
        email: `ama-e2e-${Date.now()}@test.tg`,
        dateOfBirth: '2010-05-20',
      });

    expect(res.status).toBe(201);
    studentId = res.body.data.id;
  });

  // ─── Step 5: Enroll student in class ────────────────────────────────────

  it('Step 5 — Admin enrolls student in class', async () => {
    const res = await api(app)
      .post(`/api/classes/${classId}/enroll`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId, academicYear: '2024-2025' });

    expect(res.status).toBe(201);
  });

  // ─── Step 6: Teacher creates a report card ──────────────────────────────

  it('Step 6 — Teacher creates a DRAFT report card', async () => {
    const res = await api(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        studentId,
        classId,
        academicYear: '2024-2025',
        termType: 'TRIMESTRE',
        termNumber: 1,
        termName: '1er Trimestre',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    reportId = res.body.data.id;
  });

  // ─── Step 7: Teacher enters grades ──────────────────────────────────────

  it('Step 7 — Teacher enters grades (bulk upsert)', async () => {
    const res = await api(app)
      .put(`/api/grades/report/${reportId}/bulk`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        grades: [
          { subjectId, score: 15.5, coefficient: 3 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].score).toBe(15.5);
  });

  // ─── Step 8: Update report metadata ─────────────────────────────────────

  it('Step 8 — Teacher adds comments and conduct rating', async () => {
    const res = await api(app)
      .patch(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        teacherComment: 'Bon élève, continue ainsi.',
        conductRating: 'BIEN',
        attendanceDays: 60,
        attendancePresent: 58,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.teacherComment).toBe('Bon élève, continue ainsi.');
  });

  // ─── Step 9: Teacher submits for review ─────────────────────────────────

  it('Step 9 — Teacher submits report (DRAFT → REVIEW)', async () => {
    const res = await api(app)
      .patch(`/api/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REVIEW');
  });

  // ─── Step 10: Admin publishes ────────────────────────────────────────────

  it('Step 10 — Admin publishes report (REVIEW → PUBLISHED)', async () => {
    const res = await api(app)
      .patch(`/api/reports/${reportId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');
    expect(res.body.data.overallAverage).toBeCloseTo(15.5, 1);
    expect(res.body.data.mention).toBe('Bien');
    expect(res.body.data.classRank).toBe(1);
    expect(res.body.data.classSize).toBe(1);
  });

  // ─── Step 11: Cannot edit published report ───────────────────────────────

  it('Step 11 — Cannot submit/edit a PUBLISHED report', async () => {
    const res = await api(app)
      .patch(`/api/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(403); // ForbiddenException — cannot edit published
  });

  // ─── Step 12: RBAC — Teacher cannot publish ──────────────────────────────

  it('Step 12 — Teacher cannot publish (ADMIN only)', async () => {
    // Create another report and get it to REVIEW
    const r = await api(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId, classId, academicYear: '2024-2025', termType: 'TRIMESTRE', termNumber: 2, termName: '2ème Trimestre' });

    const rId = r.body.data.id;
    await api(app).patch(`/api/reports/${rId}/submit`).set('Authorization', `Bearer ${teacherToken}`);

    const res = await api(app)
      .patch(`/api/reports/${rId}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(403);
  });
});
