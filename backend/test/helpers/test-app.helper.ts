import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import request from 'supertest';

let app: INestApplication;

export async function buildTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  return app;
}

export function api(appInstance: INestApplication) {
  return request(appInstance.getHttpServer());
}

/**
 * Register a fresh institution + admin for each e2e test suite.
 * Returns { accessToken, institutionId }.
 */
export async function seedTestInstitution(appInstance: INestApplication): Promise<{
  accessToken: string;
  institutionId: string;
  userId: string;
}> {
  // Create institution directly through Prisma
  const prisma = appInstance.get('PrismaService');
  const bcrypt = await import('bcrypt');

  const institution = await prisma.institution.create({
    data: {
      name: 'E2E Test School',
      address: 'Lomé, Togo',
      academicSettings: { termSystem: 'TRIMESTRE', passMark: 10, feeGateEnabled: true },
    },
  });

  const hashed = await bcrypt.hash('Test@12345', 12);
  const user = await prisma.user.create({
    data: {
      email: `e2e-admin-${Date.now()}@test.tg`,
      password: hashed,
      name: 'E2E Admin',
      role: 'ADMIN',
      institutionId: institution.id,
    },
  });

  const loginRes = await api(appInstance)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'Test@12345' });

  return {
    accessToken: loginRes.body.data.accessToken,
    institutionId: institution.id,
    userId: user.id,
  };
}
