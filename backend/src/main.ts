import { NestFactory, Reflector } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const globalPrefix = config.get<string>('GLOBAL_PREFIX', 'api');
  app.setGlobalPrefix(globalPrefix);

  // Security & performance middleware
  app.use(helmet());
  app.use(compression());

  // Helmet sets Cross-Origin-Resource-Policy: same-origin by default, which blocks
  // the browser from loading /uploads images when frontend and backend run on different
  // ports. Override it only for static uploads so CORP stays strict everywhere else.
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

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

  const frontendUrl = config.get<string>('FRONTEND_URL');
  if (!frontendUrl && config.get<string>('NODE_ENV') === 'production') {
    throw new Error('FRONTEND_URL must be set in production');
  }
  app.enableCors({
    origin: frontendUrl || 'http://localhost:5173',
    credentials: true,
  });

  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NovaBulletin API')
      .setDescription('Digital report card & academic bulletin platform')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
  }

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  console.log(`🚀 NovaBulletin API running on http://localhost:${port}/${globalPrefix}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start NovaBulletin:', err);
  process.exit(1);
});
