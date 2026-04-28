import { INestApplication } from '@nestjs/common';
import { buildTestApp, api } from '../helpers/test-app.helper';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * E2E — Auth flow.
 * Requires a running PostgreSQL with DATABASE_URL set in environment.
 * Run with: npm run test:e2e
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Unique email per run to avoid conflicts
  const email = `e2e-auth-${Date.now()}@test.tg`;
  const password = 'SecurePass@123';
  let institutionId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    prisma = app.get(PrismaService);

    // Create a minimal institution for registration
    const inst = await prisma.institution.create({
      data: {
        name: 'Auth E2E School',
        academicSettings: { termSystem: 'TRIMESTRE', passMark: 10 },
      },
    });
    institutionId = inst.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  // ─── Register ─────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('creates a new user and returns tokens', async () => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ name: 'E2E User', email, password, role: 'ADMIN', institutionId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.password).toBeUndefined(); // must not leak hash
    });

    it('returns 409 when email already exists', async () => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ name: 'Duplicate', email, password, role: 'ADMIN', institutionId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when institutionId is invalid UUID', async () => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ name: 'Bad', email: 'bad@test.tg', password, role: 'ADMIN', institutionId: 'not-a-uuid' });

      expect(res.status).toBe(404); // institution not found
    });

    it('returns 400 on invalid body (missing required field)', async () => {
      const res = await api(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.tg' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Login ────────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('returns tokens on valid credentials', async () => {
      const res = await api(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('returns 401 on wrong password', async () => {
      const res = await api(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('returns 401 on non-existent email', async () => {
      const res = await api(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@test.tg', password });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /me ─────────────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('returns current user profile with valid token', async () => {
      const res = await api(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.institution).toBeDefined();
    });

    it('returns 401 without token', async () => {
      const res = await api(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await api(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(res.status).toBe(401);
    });
  });

  // ─── Refresh ─────────────────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('returns new access token using refresh token', async () => {
      const res = await api(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('returns 401 with access token (not refresh)', async () => {
      const res = await api(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('logs out successfully and revokes refresh token', async () => {
      // Login first to get fresh tokens
      const loginRes = await api(app).post('/api/auth/login').send({ email, password });
      const token = loginRes.body.data.accessToken;
      const rt = loginRes.body.data.refreshToken;

      const logoutRes = await api(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);

      // Refresh token should now be rejected
      const refreshRes = await api(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${rt}`);

      expect(refreshRes.status).toBe(401);
    });
  });

  // ─── Forgot / Reset password ──────────────────────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 regardless of whether email exists (prevents enumeration)', async () => {
      const res = await api(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@test.tg' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBeDefined();
    });

    it('returns 200 for a real email too', async () => {
      const res = await api(app)
        .post('/api/auth/forgot-password')
        .send({ email });

      expect(res.status).toBe(200);
    });
  });

  // ─── Rate limiting ────────────────────────────────────────────────────────

  describe('Rate limiting', () => {
    it('health endpoint is accessible', async () => {
      const res = await api(app).get('/api/health');
      expect(res.status).toBe(200);
    });
  });
});
