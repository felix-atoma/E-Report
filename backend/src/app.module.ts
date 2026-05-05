import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as path from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { ClassesModule } from './modules/classes/classes.module';
import { StudentsModule } from './modules/students/students.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { ReportsModule } from './modules/reports/reports.module';
import { GradesModule } from './modules/grades/grades.module';
import { BulletinsModule } from './modules/bulletins/bulletins.module';
import { FeesModule } from './modules/fees/fees.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { UploadModule } from './modules/upload/upload.module';
import { BrandingModule } from './modules/branding/branding.module';
import { MailModule } from './modules/mail/mail.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { TimetablesModule } from './modules/timetables/timetables.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        rootPath: path.resolve(process.cwd(), config.get<string>('UPLOADS_DIR', 'uploads')),
        serveRoot: '/uploads',
        serveStaticOptions: { index: false },
      }],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    InstitutionsModule,
    BrandingModule,
    ClassesModule,
    StudentsModule,
    SubjectsModule,
    ReportsModule,
    GradesModule,
    BulletinsModule,
    FeesModule,
    PaymentsModule,
    NotificationsModule,
    AnalyticsModule,
    UploadModule,
    MailModule,
    WhatsAppModule,
    PdfModule,
    ProgramsModule,
    TimetablesModule,
    HealthModule,
  ],
  providers: [
    // JWT guard applied globally — use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Roles guard applied globally — use @Roles(...) to restrict
    { provide: APP_GUARD, useClass: RolesGuard },
    // Rate limiting applied globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
