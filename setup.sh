#!/usr/bin/env bash
#
# NovaBulletin - Completion Script (runs from within existing project root)
# Skips the outer-directory creation; picks up where the partial setup left off.

set -euo pipefail

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
NC=$'\033[0m'

log_step()    { echo "${NC}"; echo "${BOLD}${BLUE}▸${NC} ${BOLD}$*${NC}"; }
log_info()    { echo "  ${CYAN}ℹ${NC}  $*"; }
log_success() { echo "  ${GREEN}✓${NC}  $*"; }
log_warn()    { echo "  ${YELLOW}!${NC}  $*"; }
log_error()   { echo "  ${RED}✗${NC}  $*" >&2; }

INSTALL_DEPS=false
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL_DEPS=true ;;
    --no-install) INSTALL_DEPS=false ;;
  esac
done

# ============================================================================
# BACKEND (NestJS + TypeScript + Prisma)
# ============================================================================
log_step "Completing NestJS backend"

cd backend

# ─── Backend directory tree ────────────────────────────────────────────────
mkdir -p src/{config,common,prisma,modules,integrations,jobs,events,i18n,health}
mkdir -p src/common/{decorators,guards,interceptors,filters,pipes,middleware,enums,constants,interfaces,dto,utils}

BACKEND_MODULES=(
  "auth"
  "users"
  "institutions"
  "branding"
  "classes"
  "students"
  "subjects"
  "reports"
  "grades"
  "bulletins"
  "fees"
  "payments"
  "notifications"
  "analytics"
  "upload"
)

for mod in "${BACKEND_MODULES[@]}"; do
  mkdir -p "src/modules/$mod/dto"
  mkdir -p "src/modules/$mod/tests"
done

mkdir -p src/modules/auth/strategies
mkdir -p src/integrations/whatsapp/{providers,interfaces,templates}
mkdir -p src/integrations/email/{providers,templates}
mkdir -p src/integrations/pdf/{templates,templates/partials,templates/styles}
mkdir -p src/integrations/storage/providers
mkdir -p src/jobs/{queues,processors,schedulers}
mkdir -p src/events/{definitions,handlers}
mkdir -p src/i18n/{fr,en}
mkdir -p prisma/seed-data
mkdir -p test/{unit,e2e,fixtures,helpers}
mkdir -p uploads/{logos,stamps,crests,signatures,headers,watermarks,student-photos,report-card-pdfs,receipts,attachments}
mkdir -p logs

log_success "Backend directory tree ensured"

# ─── Backend root files ────────────────────────────────────────────────────

cat > package.json << 'PKGEOF'
{
  "name": "@novabulletin/backend",
  "version": "0.1.0",
  "description": "NovaBulletin API (NestJS + Prisma)",
  "private": true,
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/core": "^10.3.0",
    "@nestjs/event-emitter": "^2.0.4",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/serve-static": "^4.0.0",
    "@nestjs/swagger": "^7.1.17",
    "@nestjs/terminus": "^10.2.0",
    "@nestjs/throttler": "^5.1.1",
    "@prisma/client": "^5.8.0",
    "@sendgrid/mail": "^8.1.0",
    "axios": "^1.6.5",
    "bcrypt": "^5.1.1",
    "bullmq": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "date-fns": "^3.2.0",
    "handlebars": "^4.7.8",
    "ioredis": "^5.3.2",
    "joi": "^17.11.0",
    "multer": "^1.4.5-lts.1",
    "nestjs-i18n": "^10.4.0",
    "nodemailer": "^6.9.8",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "puppeteer": "^21.7.0",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1",
    "twilio": "^4.20.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.0.3",
    "@nestjs/testing": "^10.3.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.10.7",
    "@types/passport-jwt": "^4.0.0",
    "@types/passport-local": "^1.0.38",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^9.0.7",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.2",
    "jest": "^29.7.0",
    "prettier": "^3.1.1",
    "prisma": "^5.8.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.3.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
PKGEOF

cat > tsconfig.json << 'TSCEOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["src/*"],
      "@common/*": ["src/common/*"],
      "@modules/*": ["src/modules/*"],
      "@integrations/*": ["src/integrations/*"]
    }
  },
  "exclude": ["node_modules", "dist"]
}
TSCEOF

cat > tsconfig.build.json << 'TSCBEOF'
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
TSCBEOF

cat > nest-cli.json << 'NESTEOF'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      { "include": "i18n/**/*", "outDir": "dist" },
      { "include": "integrations/email/templates/**/*", "outDir": "dist" },
      { "include": "integrations/pdf/templates/**/*", "outDir": "dist" }
    ],
    "watchAssets": true
  }
}
NESTEOF

cat > .eslintrc.js << 'ESLINTEOF'
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', tsconfigRootDir: __dirname, sourceType: 'module' },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.js', 'dist/'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
ESLINTEOF

cat > .prettierrc << 'PRETTIEREOF'
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
PRETTIEREOF

cat > .gitignore << 'GITEOF'
node_modules/
dist/
coverage/
*.log
.env
.env.local
.env.*.local
.DS_Store
uploads/
logs/
.idea/
.vscode/
*.tsbuildinfo
GITEOF

cat > .env.example << 'ENVEOF'
# Server
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:4000
FRONTEND_URL=http://localhost:5173
GLOBAL_PREFIX=api

# Database
DATABASE_URL=postgresql://novabulletin:novabulletin@localhost:5432/novabulletin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Auth
JWT_SECRET=change-me-to-a-random-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-to-another-random-secret
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Storage
STORAGE_PROVIDER=LOCAL
STORAGE_LOCAL_PATH=./uploads

# Email
EMAIL_PROVIDER=SENDGRID
SENDGRID_API_KEY=
EMAIL_FROM=bulletins@novabulletin.local

# WhatsApp (Meta Business Cloud API)
WHATSAPP_PROVIDER=META
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_TEMPLATE_NAME_FR=bulletin_disponible_fr
WHATSAPP_TEMPLATE_NAME_EN=bulletin_available_en

# Twilio (alternative)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=

# Feature flags
FEE_GATE_ENABLED_DEFAULT=true
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY_MINUTES=15

# Defaults
DEFAULT_LANGUAGE=fr
DEFAULT_CURRENCY=XOF
DEFAULT_TERM_SYSTEM=TRIMESTRE

# Throttler
THROTTLE_TTL=60
THROTTLE_LIMIT=100
ENVEOF

cat > Dockerfile << 'DOCKEREOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 4000
CMD ["node", "dist/main"]
DOCKEREOF

log_success "Backend root files written"

# ─── Prisma schema ─────────────────────────────────────────────────────────

cat > prisma/schema.prisma << 'SCHEMAEOF'
// NovaBulletin Prisma schema
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  TEACHER
  PARENT
  STUDENT
  BURSAR
}

enum ReportStatus {
  DRAFT
  REVIEW
  PUBLISHED
}

enum PaymentStatus {
  PAID
  PARTIAL
  UNPAID
  EXEMPT
}

enum PaymentMethod {
  MOBILE_MONEY_TMONEY
  MOBILE_MONEY_FLOOZ
  MOBILE_MONEY_MOMO
  BANK_TRANSFER
  CASH
  CHEQUE
  OTHER
}

enum NotificationChannel {
  WHATSAPP
  EMAIL
  IN_APP
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  HELD_UNPAID
  HELD_PARTIAL
}

enum FeeType {
  TUITION
  REGISTRATION
  EXAM
  CANTEEN
  TRANSPORT
  OTHER
}

enum TermSystem {
  TRIMESTRE
  SEMESTRE
  CUSTOM
}

enum Language {
  FR
  EN
}

enum ConductRating {
  TRES_BIEN
  BIEN
  PASSABLE
  MEDIOCRE
}

model Institution {
  id                String   @id @default(uuid())
  name              String
  address           String?
  phone             String?
  email             String?
  website           String?
  motto             String?
  missionStatement  String?
  logo              String?
  crest             String?
  stamp             String?
  brandingSettings  Json?
  academicSettings  Json?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  users             User[]
  classes           Class[]
  students          Student[]
  subjects          Subject[]
  bulletins         Bulletin[]
  fees              Fee[]
  payments          Payment[]
  brandingAssets    BrandingAsset[]
  reportCardTemplates ReportCardTemplate[]
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  password        String
  name            String
  role            Role
  profileImage    String?
  whatsappNumber  String?
  whatsappVerified Boolean @default(false)
  language        Language @default(FR)
  notificationPreferences Json?
  isActive        Boolean  @default(true)

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  studentProfile  Student?  @relation("StudentUser")
  childrenAsParent Student[] @relation("ParentUser")
  classesTeaching Class[]   @relation("ClassTeacher")
  classSubjectsTeaching ClassSubject[]
  reportsCreated  ReportCard[] @relation("ReportCreator")
  bulletinsAuthored Bulletin[]
  paymentsRecorded Payment[]
  notificationLogs NotificationLog[]
  refreshTokens   RefreshToken[]
  passwordResetTokens PasswordResetToken[]
  whatsappVerifications WhatsappVerification[]
  auditLogs       AuditLog[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Class {
  id              String   @id @default(uuid())
  name            String
  level           String
  series          String?
  section         String?
  capacity        Int?
  academicYear    String
  room            String?
  notes           String?

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  teacherId       String?
  teacher         User?    @relation("ClassTeacher", fields: [teacherId], references: [id])

  students        ClassStudent[]
  subjects        ClassSubject[]
  reportCards     ReportCard[]

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Subject {
  id              String   @id @default(uuid())
  nameFr          String
  nameEn          String
  code            String
  description     String?
  category        String?
  department      String?
  passMark        Float    @default(10)

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  classSubjects   ClassSubject[]
  grades          Grade[]

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([institutionId, code])
}

model ClassStudent {
  id              String   @id @default(uuid())
  classId         String
  studentId       String
  academicYear    String
  term            String?

  class           Class    @relation(fields: [classId], references: [id])
  student         Student  @relation(fields: [studentId], references: [id])

  @@unique([classId, studentId, academicYear])
}

model ClassSubject {
  id              String   @id @default(uuid())
  classId         String
  subjectId       String
  teacherId       String?

  class           Class    @relation(fields: [classId], references: [id])
  subject         Subject  @relation(fields: [subjectId], references: [id])
  teacher         User?    @relation(fields: [teacherId], references: [id])

  @@unique([classId, subjectId])
}

model Student {
  id              String   @id @default(uuid())
  admissionNumber String   @unique
  dateOfBirth     DateTime
  enrollmentDate  DateTime @default(now())

  userId          String?  @unique
  user            User?    @relation("StudentUser", fields: [userId], references: [id])

  parentId        String?
  parent          User?    @relation("ParentUser", fields: [parentId], references: [id])

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  classes         ClassStudent[]
  reportCards     ReportCard[]
  studentFees     StudentFee[]
  payments        Payment[]
  notificationLogs NotificationLog[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ReportCard {
  id                String   @id @default(uuid())
  studentId         String
  classId           String
  academicYear      String
  termType          TermSystem
  termNumber        Int
  termName          String
  status            ReportStatus @default(DRAFT)
  teacherComment    String?
  principalComment  String?
  conductRating     ConductRating?
  attendanceDays    Int?
  attendancePresent Int?
  overallAverage    Float?
  classRank         Int?
  classSize         Int?
  mention           String?
  pdfUrl            String?
  deliveryStatus    String?
  publishedAt       DateTime?

  createdById       String
  createdBy         User     @relation("ReportCreator", fields: [createdById], references: [id])

  student           Student  @relation(fields: [studentId], references: [id])
  class             Class    @relation(fields: [classId], references: [id])
  grades            Grade[]
  notificationLogs  NotificationLog[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([studentId, academicYear, termNumber])
}

model Grade {
  id              String   @id @default(uuid())
  reportCardId    String
  subjectId       String
  score           Float
  coefficient     Float
  weightedScore   Float
  teacherComment  String?

  reportCard      ReportCard @relation(fields: [reportCardId], references: [id], onDelete: Cascade)
  subject         Subject    @relation(fields: [subjectId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([reportCardId, subjectId])
}

model Bulletin {
  id              String   @id @default(uuid())
  title           String
  content         String   @db.Text
  type            String
  targetAudience  String
  targetId        String?
  attachments     Json?
  publishedAt     DateTime?

  authorId        String
  author          User     @relation(fields: [authorId], references: [id])

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model BrandingAsset {
  id              String   @id @default(uuid())
  type            String
  label           String?
  fileUrl         String
  metadata        Json?

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ReportCardTemplate {
  id              String   @id @default(uuid())
  name            String
  description     String?
  templateKey     String
  config          Json
  isDefault       Boolean  @default(false)

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Fee {
  id              String   @id @default(uuid())
  name            String
  feeType         FeeType
  amount          Decimal  @db.Decimal(12, 2)
  currency        String   @default("XOF")
  academicYear    String
  term            String?
  appliesToLevel  String?
  appliesToClassId String?

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  studentFees     StudentFee[]

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model StudentFee {
  id              String   @id @default(uuid())
  studentId       String
  feeId           String
  academicYear    String
  term            String?
  amountDue       Decimal  @db.Decimal(12, 2)
  isExempt        Boolean  @default(false)
  exemptionReason String?

  student         Student  @relation(fields: [studentId], references: [id])
  fee             Fee      @relation(fields: [feeId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([studentId, feeId, academicYear, term])
}

model Payment {
  id              String   @id @default(uuid())
  studentId       String
  academicYear    String
  term            String?
  amount          Decimal  @db.Decimal(12, 2)
  paymentMethod   PaymentMethod
  referenceNumber String?
  receiptNumber   String   @unique
  paymentDate     DateTime
  notes           String?

  recordedById    String
  recordedBy      User     @relation(fields: [recordedById], references: [id])

  student         Student  @relation(fields: [studentId], references: [id])

  institutionId   String
  institution     Institution @relation(fields: [institutionId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model NotificationLog {
  id                String   @id @default(uuid())
  reportCardId      String?
  studentId         String?
  recipientUserId   String
  channel           NotificationChannel
  status            NotificationStatus @default(PENDING)
  heldReason        String?
  attemptCount      Int      @default(0)
  lastAttemptAt     DateTime?
  deliveredAt       DateTime?
  providerMessageId String?
  errorMessage      String?

  reportCard        ReportCard? @relation(fields: [reportCardId], references: [id])
  student           Student?    @relation(fields: [studentId], references: [id])
  recipient         User        @relation(fields: [recipientUserId], references: [id])

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model WhatsappVerification {
  id              String   @id @default(uuid())
  userId          String
  phoneNumber     String
  otpCode         String
  expiresAt       DateTime
  verifiedAt      DateTime?

  user            User     @relation(fields: [userId], references: [id])

  createdAt       DateTime @default(now())
}

model RefreshToken {
  id              String   @id @default(uuid())
  token           String   @unique
  userId          String
  expiresAt       DateTime
  revokedAt       DateTime?

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())
}

model PasswordResetToken {
  id              String   @id @default(uuid())
  token           String   @unique
  userId          String
  expiresAt       DateTime
  usedAt          DateTime?

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())
}

model AuditLog {
  id              String   @id @default(uuid())
  userId          String?
  action          String
  resource        String
  resourceId      String?
  metadata        Json?
  ipAddress       String?
  userAgent       String?

  user            User?    @relation(fields: [userId], references: [id])

  createdAt       DateTime @default(now())
}
SCHEMAEOF

cat > prisma/seed.ts << 'SEEDEOF'
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const institution = await prisma.institution.create({
    data: {
      name: 'Lycée Démonstration NovaBulletin',
      address: 'Lomé, Togo',
      phone: '+228 90 00 00 00',
      email: 'contact@demo.novabulletin.local',
      motto: "L'excellence par le savoir",
      academicSettings: {
        termSystem: 'TRIMESTRE',
        termsPerYear: 3,
        termNames: {
          fr: ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'],
          en: ['First Term', 'Second Term', 'Third Term'],
        },
        gradingScale: { min: 0, max: 20 },
        passMark: 10,
        defaultLanguage: 'fr',
      },
      brandingSettings: {
        primaryColor: '#1e40af',
        secondaryColor: '#64748b',
        accentColor: '#f59e0b',
        fontFamilyHeading: 'Open Sans',
        fontFamilyBody: 'Roboto',
      },
    },
  });

  const adminPassword = await bcrypt.hash('Admin@123', 12);
  await prisma.user.create({
    data: {
      email: 'admin@demo.novabulletin.local',
      password: adminPassword,
      name: 'Admin Principal',
      role: 'ADMIN',
      institutionId: institution.id,
    },
  });

  console.log('✅ Seed complete');
  console.log('   Admin login: admin@demo.novabulletin.local / Admin@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
SEEDEOF

log_success "Prisma schema & seed written"

# ─── Backend source files ──────────────────────────────────────────────────

cat > src/main.ts << 'MAINEOF'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const globalPrefix = config.get<string>('GLOBAL_PREFIX', 'api');
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:5173'),
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
bootstrap();
MAINEOF

cat > src/app.module.ts << 'APPEOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
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
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
    HealthModule,
  ],
})
export class AppModule {}
APPEOF

mkdir -p src/prisma

cat > src/prisma/prisma.module.ts << 'PRISMAMODEOF'
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
PRISMAMODEOF

cat > src/prisma/prisma.service.ts << 'PRISMASVCEOF'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
PRISMASVCEOF

mkdir -p src/health

cat > src/health/health.module.ts << 'HEALTHMODEOF'
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
HEALTHMODEOF

cat > src/health/health.controller.ts << 'HEALTHCTLEOF'
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
HEALTHCTLEOF

log_success "Backend entry points written"

# ─── Common enums ──────────────────────────────────────────────────────────

cat > src/common/enums/role.enum.ts << 'EOF'
export enum Role {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  BURSAR = 'BURSAR',
}
EOF

cat > src/common/enums/payment-status.enum.ts << 'EOF'
export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID',
  EXEMPT = 'EXEMPT',
}
EOF

cat > src/common/enums/notification-channel.enum.ts << 'EOF'
export enum NotificationChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}
EOF

cat > src/common/enums/notification-status.enum.ts << 'EOF'
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  HELD_UNPAID = 'HELD_UNPAID',
  HELD_PARTIAL = 'HELD_PARTIAL',
}
EOF

cat > src/common/enums/index.ts << 'EOF'
export * from './role.enum';
export * from './payment-status.enum';
export * from './notification-channel.enum';
export * from './notification-status.enum';
EOF

# ─── Common decorators ─────────────────────────────────────────────────────

cat > src/common/decorators/roles.decorator.ts << 'EOF'
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
EOF

cat > src/common/decorators/current-user.decorator.ts << 'EOF'
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
EOF

cat > src/common/decorators/public.decorator.ts << 'EOF'
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
EOF

# ─── Module skeletons ──────────────────────────────────────────────────────

generate_module() {
  local module_name="$1"
  # Capitalize first letter and convert kebab-case to PascalCase
  local class_name
  class_name=$(echo "$module_name" | awk -F'-' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2); OFS=""; print}')

  # Only create if the module file doesn't already exist
  if [ ! -f "src/modules/$module_name/$module_name.module.ts" ]; then
    cat > "src/modules/$module_name/$module_name.module.ts" << MODEOF
import { Module } from '@nestjs/common';
import { ${class_name}Controller } from './$module_name.controller';
import { ${class_name}Service } from './$module_name.service';

@Module({
  controllers: [${class_name}Controller],
  providers: [${class_name}Service],
  exports: [${class_name}Service],
})
export class ${class_name}Module {}
MODEOF

    cat > "src/modules/$module_name/$module_name.controller.ts" << CTLEOF
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ${class_name}Service } from './$module_name.service';

@ApiTags('$module_name')
@ApiBearerAuth()
@Controller('$module_name')
export class ${class_name}Controller {
  constructor(private readonly service: ${class_name}Service) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
CTLEOF

    cat > "src/modules/$module_name/$module_name.service.ts" << SVCEOF
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ${class_name}Service {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // TODO: implement
    return [];
  }
}
SVCEOF
  fi
}

for mod in "${BACKEND_MODULES[@]}"; do
  generate_module "$mod"
done

log_success "Module skeletons generated"

# ─── i18n & template placeholders ─────────────────────────────────────────

cat > src/i18n/fr/common.json << 'EOF'
{
  "welcome": "Bienvenue sur NovaBulletin",
  "errors": {
    "unauthorized": "Non autorisé",
    "notFound": "Ressource introuvable",
    "validation": "Données invalides"
  }
}
EOF

cat > src/i18n/en/common.json << 'EOF'
{
  "welcome": "Welcome to NovaBulletin",
  "errors": {
    "unauthorized": "Unauthorized",
    "notFound": "Resource not found",
    "validation": "Invalid data"
  }
}
EOF

cat > src/integrations/email/templates/bulletin-available.fr.hbs << 'EOF'
<!DOCTYPE html>
<html>
<body>
  <h1>Bulletin disponible</h1>
  <p>Bonjour {{parentName}},</p>
  <p>Le bulletin de {{studentName}} pour le {{termName}} est disponible.</p>
  <p>Moyenne générale: <strong>{{overallAverage}}/20</strong></p>
  <p>Mention: <strong>{{mention}}</strong></p>
  <p>Veuillez trouver le bulletin officiel en pièce jointe.</p>
  <p>— {{schoolName}}</p>
</body>
</html>
EOF

cat > src/integrations/whatsapp/templates/templates.json << 'EOF'
{
  "bulletin_disponible_fr": {
    "language": "fr",
    "category": "UTILITY",
    "components": [
      {
        "type": "BODY",
        "text": "Bonjour {{1}}, le bulletin de {{2}} pour le {{3}} est disponible. Moyenne: {{4}}/20 — Mention: {{5}}. Bulletin en pièce jointe. — {{6}}"
      }
    ]
  }
}
EOF

cd ..  # back to project root

log_success "Backend complete"

# ============================================================================
# FRONTEND (React + JavaScript + Vite + Hybrid SCSS/CSS)
# ============================================================================
log_step "Creating React frontend"

mkdir -p frontend
cd frontend

mkdir -p public/locales/{fr,en}
mkdir -p src/{components,pages,routes,services,context,hooks,utils,locales,assets}
mkdir -p src/assets/{images,icons,fonts}
mkdir -p src/assets/images/illustrations
mkdir -p src/styles/{settings,tools,base,shared,utilities,animations,themes}

COMPONENT_DOMAINS=(
  "common" "layout" "auth" "dashboard" "institutions" "branding"
  "classes" "students" "subjects" "reports" "bulletins" "fees"
  "payments" "notifications" "parent" "analytics" "settings"
)

for d in "${COMPONENT_DOMAINS[@]}"; do
  mkdir -p "src/components/$d"
done

COMMON_COMPONENTS=(
  "Button" "Input" "Select" "Textarea" "Checkbox" "RadioGroup"
  "DatePicker" "FileUpload" "ColorPicker" "Card" "Modal" "ConfirmDialog"
  "Loading" "Spinner" "EmptyState" "ErrorBoundary" "Toast" "Badge"
  "StatusPill" "Avatar" "Tooltip" "Tabs" "Pagination" "Table"
  "SearchBar" "LanguageSwitcher" "PdfViewer"
)
for c in "${COMMON_COMPONENTS[@]}"; do mkdir -p "src/components/common/$c"; done

LAYOUT_COMPONENTS=("AppShell" "Sidebar" "Topbar" "Footer" "Breadcrumbs" "PageHeader")
for c in "${LAYOUT_COMPONENTS[@]}"; do mkdir -p "src/components/layout/$c"; done

AUTH_COMPONENTS=("LoginForm" "RegisterForm" "ForgotPasswordForm" "ResetPasswordForm" "ProtectedRoute")
for c in "${AUTH_COMPONENTS[@]}"; do mkdir -p "src/components/auth/$c"; done

REPORT_COMPONENTS=(
  "ReportCardList" "ReportCardForm" "ReportCardDetail" "GradeEntryTable"
  "GradeRow" "CalculationSummary" "TeacherCommentsForm" "PrincipalCommentForm"
  "ConductRating" "AttendanceInput" "PublishConfirmation" "DeliveryStatusPanel"
  "BulkReportGenerator" "ReportCardPdfPreview"
)
for c in "${REPORT_COMPONENTS[@]}"; do mkdir -p "src/components/reports/$c"; done

FEE_COMPONENTS=("FeeStructureList" "FeeStructureForm" "FeeAssignmentTable" "ExemptionForm" "FeeReports")
for c in "${FEE_COMPONENTS[@]}"; do mkdir -p "src/components/fees/$c"; done

PAYMENT_COMPONENTS=(
  "PaymentList" "PaymentForm" "PaymentReceipt" "StudentPaymentHistory"
  "PaymentStatusBadge" "OutstandingBalances" "BursarDashboard"
)
for c in "${PAYMENT_COMPONENTS[@]}"; do mkdir -p "src/components/payments/$c"; done

NOTIF_COMPONENTS=(
  "NotificationCenter" "NotificationList" "NotificationLogTable"
  "NotificationPreferences" "WhatsappVerification" "ResendButton" "ForceSendDialog"
)
for c in "${NOTIF_COMPONENTS[@]}"; do mkdir -p "src/components/notifications/$c"; done

PARENT_COMPONENTS=("ChildrenList" "ChildReportCard" "PaywallNotice" "FeeBalanceCard" "ProgressOverview")
for c in "${PARENT_COMPONENTS[@]}"; do mkdir -p "src/components/parent/$c"; done

mkdir -p src/pages/{auth,admin,teacher,parent,student,shared}
mkdir -p src/pages/HomePage

ADMIN_PAGES=(
  "AdminDashboardPage" "InstitutionsPage" "BrandingPage" "UsersPage"
  "ClassesPage" "StudentsPage" "SubjectsPage" "FeesPage" "PaymentsPage"
  "NotificationLogsPage" "AnalyticsPage" "SettingsPage"
)
for p in "${ADMIN_PAGES[@]}"; do mkdir -p "src/pages/admin/$p"; done

TEACHER_PAGES=(
  "TeacherDashboardPage" "MyClassesPage" "ClassDetailPage" "ReportCardsPage"
  "CreateReportCardPage" "EditReportCardPage" "BulletinsPage" "StudentProfilePage"
)
for p in "${TEACHER_PAGES[@]}"; do mkdir -p "src/pages/teacher/$p"; done

PARENT_PAGES=(
  "ParentDashboardPage" "ChildrenPage" "ChildReportCardsPage"
  "ChildBulletinsPage" "PaymentHistoryPage" "NotificationPreferencesPage"
)
for p in "${PARENT_PAGES[@]}"; do mkdir -p "src/pages/parent/$p"; done

STUDENT_PAGES=("StudentDashboardPage" "MyReportCardsPage" "BulletinsPage" "ProgressPage")
for p in "${STUDENT_PAGES[@]}"; do mkdir -p "src/pages/student/$p"; done

AUTH_PAGES=("LoginPage" "RegisterPage" "ForgotPasswordPage" "ResetPasswordPage")
for p in "${AUTH_PAGES[@]}"; do mkdir -p "src/pages/auth/$p"; done

SHARED_PAGES=("ProfilePage" "NotFoundPage" "UnauthorizedPage" "ErrorPage")
for p in "${SHARED_PAGES[@]}"; do mkdir -p "src/pages/shared/$p"; done

log_success "Frontend directory tree created"

# ─── Frontend root files ───────────────────────────────────────────────────

cat > package.json << 'PKGEOF'
{
  "name": "@novabulletin/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .js,.jsx --fix",
    "test": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.17.9",
    "axios": "^1.6.5",
    "date-fns": "^3.2.0",
    "i18next": "^23.7.16",
    "i18next-browser-languagedetector": "^7.2.0",
    "i18next-http-backend": "^2.4.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^14.2.3",
    "react-hook-form": "^7.49.3",
    "react-hot-toast": "^2.4.1",
    "react-i18next": "^14.0.0",
    "react-icons": "^5.0.1",
    "react-pdf": "^7.6.0",
    "react-quill": "^2.0.0",
    "react-router-dom": "^6.21.1",
    "recharts": "^2.10.4"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@types/react": "^18.2.46",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.56.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.1.1",
    "sass": "^1.69.7",
    "vite": "^5.0.10",
    "vitest": "^1.1.3"
  }
}
PKGEOF

cat > vite.config.js << 'VITEEOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/styles/settings/colors" as *;
          @use "@/styles/settings/spacing" as *;
          @use "@/styles/settings/typography" as *;
          @use "@/styles/settings/breakpoints" as *;
        `,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
VITEEOF

cat > index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NovaBulletin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>
HTMLEOF

cat > .gitignore << 'GITEOF'
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
.idea/
.vscode/
coverage/
GITEOF

cat > .env.example << 'ENVEOF'
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=NovaBulletin
VITE_DEFAULT_LANGUAGE=fr
VITE_SUPPORTED_LANGUAGES=fr,en
ENVEOF

cat > .eslintrc.cjs << 'ESLINTEOF'
module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
};
ESLINTEOF

cat > .prettierrc << 'PRETTIEREOF'
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
PRETTIEREOF

cat > Dockerfile << 'DOCKEREOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
DOCKEREOF

cat > nginx.conf << 'NGINXEOF'
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
  location /api { proxy_pass http://backend:4000/api; }
}
NGINXEOF

log_success "Frontend root files written"

# ─── Global SCSS ───────────────────────────────────────────────────────────

cat > src/styles/main.scss << 'EOF'
// NovaBulletin global stylesheet — single entry point

@use 'settings/colors' as *;
@use 'settings/spacing' as *;
@use 'settings/typography' as *;
@use 'settings/breakpoints' as *;
@use 'settings/shadows' as *;
@use 'settings/radius' as *;
@use 'settings/z-index' as *;

@use 'tools/media-queries' as *;
@use 'tools/flexbox' as *;
@use 'tools/focus-ring' as *;
@use 'tools/visually-hidden' as *;

@use 'settings/root';

@use 'base/reset';
@use 'base/box-sizing';
@use 'base/typography';
@use 'base/forms';
@use 'base/print';

@use 'shared/container';
@use 'shared/stack';
@use 'shared/cluster';
@use 'shared/btn-base';
@use 'shared/card-base';
@use 'shared/form-field';

@use 'animations/keyframes';
@use 'animations/transitions';

@use 'utilities/spacing';
@use 'utilities/text';
@use 'utilities/display';
@use 'utilities/flex';

@use 'themes/dynamic-branding';
EOF

cat > src/styles/settings/_colors.scss << 'EOF'
$color-primary: #1e40af;
$color-secondary: #64748b;
$color-accent: #f59e0b;
$color-success: #10b981;
$color-danger: #ef4444;
$color-warning: #f59e0b;
$color-info: #3b82f6;

$color-text: #1f2937;
$color-text-muted: #6b7280;
$color-text-inverse: #ffffff;

$color-bg: #ffffff;
$color-bg-subtle: #f9fafb;
$color-bg-muted: #f3f4f6;

$color-border: #e5e7eb;
$color-border-strong: #d1d5db;

$color-status-paid: #10b981;
$color-status-partial: #f59e0b;
$color-status-unpaid: #ef4444;
$color-status-exempt: #6b7280;
EOF

cat > src/styles/settings/_spacing.scss << 'EOF'
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
$spacing-2xl: 48px;
$spacing-3xl: 64px;
EOF

cat > src/styles/settings/_typography.scss << 'EOF'
$font-family-heading: 'Open Sans', system-ui, sans-serif;
$font-family-body: 'Roboto', system-ui, sans-serif;
$font-family-mono: 'Courier New', monospace;

$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-md: 16px;
$font-size-lg: 18px;
$font-size-xl: 24px;
$font-size-2xl: 32px;

$font-weight-regular: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;
EOF

cat > src/styles/settings/_breakpoints.scss << 'EOF'
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;
EOF

cat > src/styles/settings/_shadows.scss << 'EOF'
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
EOF

cat > src/styles/settings/_radius.scss << 'EOF'
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-full: 9999px;
EOF

cat > src/styles/settings/_z-index.scss << 'EOF'
$z-dropdown: 100;
$z-sticky: 200;
$z-modal: 300;
$z-toast: 400;
$z-tooltip: 500;
EOF

cat > src/styles/settings/_root.scss << 'EOF'
@use 'colors' as *;
@use 'spacing' as *;
@use 'typography' as *;
@use 'shadows' as *;
@use 'radius' as *;

:root {
  --color-primary: #{$color-primary};
  --color-secondary: #{$color-secondary};
  --color-accent: #{$color-accent};
  --color-success: #{$color-success};
  --color-danger: #{$color-danger};
  --color-warning: #{$color-warning};
  --color-info: #{$color-info};

  --color-text: #{$color-text};
  --color-text-muted: #{$color-text-muted};
  --color-text-inverse: #{$color-text-inverse};

  --color-bg: #{$color-bg};
  --color-bg-subtle: #{$color-bg-subtle};
  --color-bg-muted: #{$color-bg-muted};

  --color-border: #{$color-border};
  --color-border-strong: #{$color-border-strong};

  --color-status-paid: #{$color-status-paid};
  --color-status-partial: #{$color-status-partial};
  --color-status-unpaid: #{$color-status-unpaid};
  --color-status-exempt: #{$color-status-exempt};

  --font-family-heading: #{$font-family-heading};
  --font-family-body: #{$font-family-body};
  --font-family-mono: #{$font-family-mono};

  --font-size-xs: #{$font-size-xs};
  --font-size-sm: #{$font-size-sm};
  --font-size-md: #{$font-size-md};
  --font-size-lg: #{$font-size-lg};
  --font-size-xl: #{$font-size-xl};
  --font-size-2xl: #{$font-size-2xl};

  --font-weight-regular: #{$font-weight-regular};
  --font-weight-medium: #{$font-weight-medium};
  --font-weight-semibold: #{$font-weight-semibold};
  --font-weight-bold: #{$font-weight-bold};

  --spacing-xs: #{$spacing-xs};
  --spacing-sm: #{$spacing-sm};
  --spacing-md: #{$spacing-md};
  --spacing-lg: #{$spacing-lg};
  --spacing-xl: #{$spacing-xl};
  --spacing-2xl: #{$spacing-2xl};

  --radius-sm: #{$radius-sm};
  --radius-md: #{$radius-md};
  --radius-lg: #{$radius-lg};
  --radius-full: #{$radius-full};

  --shadow-sm: #{$shadow-sm};
  --shadow-md: #{$shadow-md};
  --shadow-lg: #{$shadow-lg};

  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;
}
EOF

cat > src/styles/tools/_media-queries.scss << 'EOF'
@use '../settings/breakpoints' as *;

@mixin sm-up { @media (min-width: $breakpoint-sm) { @content; } }
@mixin md-up { @media (min-width: $breakpoint-md) { @content; } }
@mixin lg-up { @media (min-width: $breakpoint-lg) { @content; } }
@mixin xl-up { @media (min-width: $breakpoint-xl) { @content; } }
EOF

cat > src/styles/tools/_flexbox.scss << 'EOF'
@mixin flex-center { display: flex; align-items: center; justify-content: center; }
@mixin flex-between { display: flex; align-items: center; justify-content: space-between; }
EOF

cat > src/styles/tools/_focus-ring.scss << 'EOF'
@mixin focus-ring($color: var(--color-primary)) {
  outline: 2px solid #{$color};
  outline-offset: 2px;
}
EOF

cat > src/styles/tools/_visually-hidden.scss << 'EOF'
@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
EOF

cat > src/styles/base/_reset.scss << 'EOF'
*, *::before, *::after { margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { line-height: 1.5; }
img, picture, video, canvas, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; }
ul, ol { list-style: none; }
a { color: inherit; text-decoration: none; }
EOF

cat > src/styles/base/_box-sizing.scss << 'EOF'
*, *::before, *::after { box-sizing: border-box; }
EOF

cat > src/styles/base/_typography.scss << 'EOF'
body {
  font-family: var(--font-family-body);
  font-size: var(--font-size-md);
  color: var(--color-text);
  background-color: var(--color-bg);
}
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-family-heading);
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
}
h1 { font-size: var(--font-size-2xl); }
h2 { font-size: var(--font-size-xl); }
h3 { font-size: var(--font-size-lg); }
EOF

cat > src/styles/base/_forms.scss << 'EOF'
input, select, textarea {
  font-family: var(--font-family-body);
  font-size: var(--font-size-md);
  color: var(--color-text);
}
EOF

cat > src/styles/base/_print.scss << 'EOF'
@media print {
  body { background: white; }
  .no-print { display: none !important; }
}
EOF

cat > src/styles/shared/_container.scss << 'EOF'
.container {
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: var(--spacing-md);
}
.container--narrow { max-width: 768px; }
EOF

cat > src/styles/shared/_stack.scss << 'EOF'
.stack > * + * { margin-top: var(--spacing-md); }
.stack--sm > * + * { margin-top: var(--spacing-sm); }
.stack--lg > * + * { margin-top: var(--spacing-lg); }
EOF

cat > src/styles/shared/_cluster.scss << 'EOF'
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  align-items: center;
}
EOF

cat > src/styles/shared/_btn-base.scss << 'EOF'
@use '../tools/focus-ring' as *;

.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  border: none;
  font-family: var(--font-family-body);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast), transform var(--transition-fast);

  &:focus-visible { @include focus-ring; }

  &:disabled, &[aria-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
EOF

cat > src/styles/shared/_card-base.scss << 'EOF'
.card-base {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-lg);
}
EOF

cat > src/styles/shared/_form-field.scss << 'EOF'
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.form-field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}
.form-field__error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
}
EOF

cat > src/styles/utilities/_spacing.scss << 'EOF'
.u-mt-xs { margin-top: var(--spacing-xs); }
.u-mt-sm { margin-top: var(--spacing-sm); }
.u-mt-md { margin-top: var(--spacing-md); }
.u-mt-lg { margin-top: var(--spacing-lg); }
.u-mb-xs { margin-bottom: var(--spacing-xs); }
.u-mb-sm { margin-bottom: var(--spacing-sm); }
.u-mb-md { margin-bottom: var(--spacing-md); }
.u-mb-lg { margin-bottom: var(--spacing-lg); }
EOF

cat > src/styles/utilities/_text.scss << 'EOF'
.u-text-center { text-align: center; }
.u-text-right { text-align: right; }
.u-text-muted { color: var(--color-text-muted); }
.u-text-bold { font-weight: var(--font-weight-bold); }
.u-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
EOF

cat > src/styles/utilities/_display.scss << 'EOF'
.u-hidden { display: none !important; }
.u-block { display: block; }
.u-inline { display: inline; }
.u-inline-block { display: inline-block; }
EOF

cat > src/styles/utilities/_flex.scss << 'EOF'
.u-flex { display: flex; }
.u-flex-col { display: flex; flex-direction: column; }
.u-items-center { align-items: center; }
.u-justify-between { justify-content: space-between; }
.u-gap-sm { gap: var(--spacing-sm); }
.u-gap-md { gap: var(--spacing-md); }
EOF

cat > src/styles/animations/_keyframes.scss << 'EOF'
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
EOF

cat > src/styles/animations/_transitions.scss << 'EOF'
.transition-base { transition: all var(--transition-base); }
.fade-in { animation: fade-in var(--transition-base); }
.slide-up { animation: slide-up var(--transition-base); }
EOF

cat > src/styles/themes/_dynamic-branding.scss << 'EOF'
// Dynamic branding: CSS variables overridden at runtime by ThemeContext
EOF

log_success "SCSS architecture written"

# ─── Frontend entry points ─────────────────────────────────────────────────

cat > src/index.jsx << 'IDXEOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
IDXEOF

cat > src/App.jsx << 'APPEOF'
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { InstitutionProvider } from './context/InstitutionContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRouter from './routes/AppRouter';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <InstitutionProvider>
              <ThemeProvider>
                <AppRouter />
                <Toaster position="top-right" />
              </ThemeProvider>
            </InstitutionProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
APPEOF

cat > src/App.css << 'APPCSSEOF'
/* App-level layout only. Component styles live next to their components. */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
APPCSSEOF

# ─── Button component (full implementation) ────────────────────────────────

cat > src/components/common/Button/Button.jsx << 'BTNEOF'
import './Button.css';

function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  icon,
  children,
  disabled,
  type = 'button',
  onClick,
  ...rest
}) {
  const classes = [
    'btn-base',
    'button',
    `button--${variant}`,
    `button--${size}`,
    iconOnly && 'button--icon-only',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick} {...rest}>
      {icon && <span className="button__icon">{icon}</span>}
      {!iconOnly && <span className="button__label">{children}</span>}
    </button>
  );
}

export default Button;
BTNEOF

cat > src/components/common/Button/Button.css << 'BTNCSSEOF'
.button--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}
.button--primary:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-primary) 85%, black);
}
.button--secondary {
  background-color: var(--color-bg-muted);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.button--secondary:hover:not(:disabled) { background-color: var(--color-border); }
.button--danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}
.button--ghost {
  background-color: transparent;
  color: var(--color-primary);
}
.button--ghost:hover:not(:disabled) { background-color: var(--color-bg-muted); }
.button--sm { padding: var(--spacing-xs) var(--spacing-sm); font-size: var(--font-size-xs); }
.button--lg { padding: var(--spacing-md) var(--spacing-lg); font-size: var(--font-size-md); }
.button--icon-only { padding: var(--spacing-sm); }
.button__icon { display: inline-flex; width: 16px; height: 16px; }
.button__label { white-space: nowrap; }
BTNCSSEOF

# ─── PaywallNotice component ───────────────────────────────────────────────

cat > src/components/parent/PaywallNotice/PaywallNotice.jsx << 'PWEOF'
import Button from '../../common/Button/Button';
import './PaywallNotice.css';

function PaywallNotice({ studentName, termName, balance, currency = 'FCFA', onContact }) {
  return (
    <div className="paywall-notice">
      <div className="paywall-notice__header">
        <span className="paywall-notice__icon" aria-hidden="true">📋</span>
        <h2 className="paywall-notice__title">Bulletin disponible</h2>
      </div>
      <p className="paywall-notice__message">
        Le bulletin de <strong>{studentName}</strong> pour le <strong>{termName}</strong> est
        disponible. Veuillez régler les frais de scolarité pour y accéder.
      </p>
      <div className="paywall-notice__balance">
        <span className="paywall-notice__balance-label">Solde restant</span>
        <span className="paywall-notice__balance-amount">
          {balance.toLocaleString('fr-FR')} {currency}
        </span>
      </div>
      <div className="paywall-notice__actions">
        <Button variant="primary" onClick={onContact}>
          Contacter la comptabilité
        </Button>
      </div>
    </div>
  );
}

export default PaywallNotice;
PWEOF

cat > src/components/parent/PaywallNotice/PaywallNotice.css << 'PWCSSEOF'
.paywall-notice {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-warning);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.paywall-notice__header { display: flex; align-items: center; gap: var(--spacing-sm); }
.paywall-notice__icon { font-size: var(--font-size-xl); color: var(--color-warning); }
.paywall-notice__title {
  font-family: var(--font-family-heading);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
}
.paywall-notice__message { color: var(--color-text-muted); line-height: 1.6; margin: 0; }
.paywall-notice__balance {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: var(--spacing-md);
  background-color: var(--color-bg);
  border-radius: var(--radius-sm);
}
.paywall-notice__balance-label { font-size: var(--font-size-sm); color: var(--color-text-muted); }
.paywall-notice__balance-amount {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-danger);
}
.paywall-notice__actions { display: flex; gap: var(--spacing-sm); }
@media (max-width: 640px) {
  .paywall-notice__balance { flex-direction: column; align-items: flex-start; gap: var(--spacing-xs); }
}
PWCSSEOF

# ─── Placeholder components ────────────────────────────────────────────────

generate_placeholder_component() {
  local component_path="$1"
  local component_name
  component_name=$(basename "$component_path")
  local css_class
  css_class=$(echo "$component_name" | sed 's/\([A-Z]\)/-\L\1/g' | sed 's/^-//')

  if [ ! -f "$component_path/$component_name.jsx" ]; then
    cat > "$component_path/$component_name.jsx" << COMPEOF
import './$component_name.css';

function $component_name() {
  return (
    <div className="$css_class">
      <p>$component_name — TODO: implement</p>
    </div>
  );
}

export default $component_name;
COMPEOF

    cat > "$component_path/$component_name.css" << COMPCSSEOF
.$css_class {
  padding: var(--spacing-md);
}
COMPCSSEOF
  fi
}

for c in "${COMMON_COMPONENTS[@]}"; do
  [ "$c" != "Button" ] && generate_placeholder_component "src/components/common/$c"
done
for c in "${LAYOUT_COMPONENTS[@]}"; do generate_placeholder_component "src/components/layout/$c"; done
for c in "${AUTH_COMPONENTS[@]}"; do generate_placeholder_component "src/components/auth/$c"; done
for c in "${REPORT_COMPONENTS[@]}"; do generate_placeholder_component "src/components/reports/$c"; done
for c in "${FEE_COMPONENTS[@]}"; do generate_placeholder_component "src/components/fees/$c"; done
for c in "${PAYMENT_COMPONENTS[@]}"; do generate_placeholder_component "src/components/payments/$c"; done
for c in "${NOTIF_COMPONENTS[@]}"; do generate_placeholder_component "src/components/notifications/$c"; done
for c in "${PARENT_COMPONENTS[@]}"; do
  [ "$c" != "PaywallNotice" ] && generate_placeholder_component "src/components/parent/$c"
done

for p in "${ADMIN_PAGES[@]}";   do generate_placeholder_component "src/pages/admin/$p";   done
for p in "${TEACHER_PAGES[@]}"; do generate_placeholder_component "src/pages/teacher/$p"; done
for p in "${PARENT_PAGES[@]}";  do generate_placeholder_component "src/pages/parent/$p";  done
for p in "${STUDENT_PAGES[@]}"; do generate_placeholder_component "src/pages/student/$p"; done
for p in "${AUTH_PAGES[@]}";    do generate_placeholder_component "src/pages/auth/$p";    done
for p in "${SHARED_PAGES[@]}";  do generate_placeholder_component "src/pages/shared/$p";  done
generate_placeholder_component "src/pages/HomePage"

log_success "Placeholder components & pages generated"

# ─── Context providers ─────────────────────────────────────────────────────

cat > src/context/AuthContext.jsx << 'AUTHCTXEOF'
import { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
AUTHCTXEOF

cat > src/context/InstitutionContext.jsx << 'INSTCTXEOF'
import { createContext, useContext, useState } from 'react';

export const InstitutionContext = createContext(null);

export function InstitutionProvider({ children }) {
  const [institution, setInstitution] = useState(null);
  return (
    <InstitutionContext.Provider value={{ institution, setInstitution }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export const useInstitution = () => useContext(InstitutionContext);
INSTCTXEOF

cat > src/context/ThemeContext.jsx << 'THEMECTXEOF'
import { createContext, useContext, useEffect } from 'react';
import { useInstitution } from './InstitutionContext';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { institution } = useInstitution();

  useEffect(() => {
    if (!institution?.brandingSettings) return;
    const root = document.documentElement;
    const b = institution.brandingSettings;
    if (b.primaryColor) root.style.setProperty('--color-primary', b.primaryColor);
    if (b.secondaryColor) root.style.setProperty('--color-secondary', b.secondaryColor);
    if (b.accentColor) root.style.setProperty('--color-accent', b.accentColor);
    if (b.fontFamilyHeading) root.style.setProperty('--font-family-heading', b.fontFamilyHeading);
    if (b.fontFamilyBody) root.style.setProperty('--font-family-body', b.fontFamilyBody);
  }, [institution]);

  return <ThemeContext.Provider value={institution}>{children}</ThemeContext.Provider>;
}
THEMECTXEOF

cat > src/context/LanguageContext.jsx << 'LANGCTXEOF'
import { createContext, useContext, useState } from 'react';

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('fr');
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
LANGCTXEOF

cat > src/routes/AppRouter.jsx << 'ROUTEREOF'
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage/HomePage';
import LoginPage from '../pages/auth/LoginPage/LoginPage';
import NotFoundPage from '../pages/shared/NotFoundPage/NotFoundPage';

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
ROUTEREOF

cat > src/services/api.js << 'APIEOF'
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // TODO: refresh token flow
    }
    return Promise.reject(err);
  },
);

export default api;
APIEOF

cat > src/services/authService.js << 'AUTHSVCEOF'
import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};
AUTHSVCEOF

cat > public/locales/fr/common.json << 'EOF'
{
  "appName": "NovaBulletin",
  "welcome": "Bienvenue",
  "login": "Se connecter",
  "logout": "Déconnexion",
  "save": "Enregistrer",
  "cancel": "Annuler"
}
EOF

cat > public/locales/en/common.json << 'EOF'
{
  "appName": "NovaBulletin",
  "welcome": "Welcome",
  "login": "Log in",
  "logout": "Log out",
  "save": "Save",
  "cancel": "Cancel"
}
EOF

cat > src/locales/i18n.js << 'I18NEOF'
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    ns: ['common'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    interpolation: { escapeValue: false },
  });

export default i18n;
I18NEOF

cd ..  # back to project root

log_success "Frontend complete"

# ============================================================================
# SHARED FOLDER
# ============================================================================
log_step "Creating shared folder"

mkdir -p shared/{enums,constants,utils}

cat > shared/package.json << 'PKGEOF'
{
  "name": "@novabulletin/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./index.js",
  "type": "module"
}
PKGEOF

cat > shared/index.js << 'EOF'
export * from './enums/role.js';
export * from './enums/paymentStatus.js';
export * from './enums/notificationStatus.js';
export * from './constants/mentions.js';
export * from './utils/calculations.js';
EOF

cat > shared/enums/role.js << 'EOF'
export const Role = Object.freeze({
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  STUDENT: 'STUDENT',
  BURSAR: 'BURSAR',
});
EOF

cat > shared/enums/paymentStatus.js << 'EOF'
export const PaymentStatus = Object.freeze({
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  UNPAID: 'UNPAID',
  EXEMPT: 'EXEMPT',
});
EOF

cat > shared/enums/notificationStatus.js << 'EOF'
export const NotificationStatus = Object.freeze({
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  HELD_UNPAID: 'HELD_UNPAID',
  HELD_PARTIAL: 'HELD_PARTIAL',
});
EOF

cat > shared/constants/mentions.js << 'EOF'
export const MENTIONS = [
  { min: 18, max: 20,    fr: 'Excellent',     en: 'Excellent' },
  { min: 16, max: 17.99, fr: 'Très Bien',     en: 'Very Good' },
  { min: 14, max: 15.99, fr: 'Bien',          en: 'Good' },
  { min: 12, max: 13.99, fr: 'Assez Bien',    en: 'Fair' },
  { min: 10, max: 11.99, fr: 'Passable',      en: 'Pass' },
  { min: 0,  max: 9.99,  fr: 'Insuffisant',   en: 'Fail' },
];

export function getMention(average, lang = 'fr') {
  const m = MENTIONS.find((x) => average >= x.min && average <= x.max);
  return m ? m[lang] : '';
}
EOF

cat > shared/utils/calculations.js << 'EOF'
export function calculateOverallAverage(grades) {
  if (!grades || grades.length === 0) return 0;
  const totalPoints = grades.reduce((sum, g) => sum + g.score * g.coefficient, 0);
  const totalCoefficients = grades.reduce((sum, g) => sum + g.coefficient, 0);
  if (totalCoefficients === 0) return 0;
  return Math.round((totalPoints / totalCoefficients) * 100) / 100;
}

export function calculateWeightedScore(score, coefficient) {
  return Math.round(score * coefficient * 100) / 100;
}
EOF

log_success "Shared folder created"

# ============================================================================
# ROOT CONFIG FILES
# ============================================================================
log_step "Writing root config files"

mkdir -p .github/workflows

cat > docker-compose.yml << 'DCEOF'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: novabulletin
      POSTGRES_PASSWORD: novabulletin
      POSTGRES_DB: novabulletin
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
DCEOF

cat > docker-compose.prod.yml << 'DCPEOF'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  backend:
    build: ./backend
    env_file: ./backend/.env
    depends_on: [postgres, redis]
    restart: unless-stopped

  worker:
    build: ./backend
    command: node dist/jobs/worker.js
    env_file: ./backend/.env
    depends_on: [postgres, redis]
    restart: unless-stopped

  frontend:
    build: ./frontend
    depends_on: [backend]
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on: [backend, frontend]
    restart: unless-stopped

volumes:
  postgres_data:
DCPEOF

cat > package.json << 'PKGEOF'
{
  "name": "novabulletin",
  "version": "0.1.0",
  "private": true,
  "description": "NovaBulletin — Digital Report Card & Academic Bulletin Platform",
  "workspaces": ["backend", "frontend", "shared"],
  "scripts": {
    "dev": "concurrently -n backend,frontend -c blue,green \"npm run start:dev -w backend\" \"npm run dev -w frontend\"",
    "dev:backend": "npm run start:dev -w backend",
    "dev:frontend": "npm run dev -w frontend",
    "build": "npm run build -w backend && npm run build -w frontend",
    "lint": "npm run lint -w backend && npm run lint -w frontend",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "db:migrate": "npm run prisma:migrate -w backend",
    "db:seed": "npm run prisma:seed -w backend",
    "db:studio": "npm run prisma:studio -w backend"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
PKGEOF

cat > .gitignore << 'GITEOF'
node_modules/
dist/
build/
.env
.env.local
.env.*.local
*.log
.DS_Store
.idea/
.vscode/
coverage/
*.tsbuildinfo
backend/uploads/
backend/logs/
GITEOF

cat > .editorconfig << 'EDITOREOF'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
EDITOREOF

cat > .nvmrc << 'EOF'
20
EOF

cat > .github/workflows/backend-ci.yml << 'CIEOF'
name: Backend CI
on:
  push:
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: cd backend && npm ci
      - run: cd backend && npx prisma generate
      - run: cd backend && npm run lint
      - run: cd backend && npm test
CIEOF

cat > .github/workflows/frontend-ci.yml << 'CIEOF'
name: Frontend CI
on:
  push:
    paths: ['frontend/**']
  pull_request:
    paths: ['frontend/**']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build
CIEOF

cat > README.md << 'READMEEOF'
# NovaBulletin

Digital report card & academic bulletin platform for Togolese schools (and beyond).

## Stack

- **Backend:** NestJS · TypeScript · Prisma · PostgreSQL · BullMQ · Redis
- **Frontend:** React · JavaScript · Vite · SCSS (hybrid: global tokens + per-component CSS)
- **Notifications:** WhatsApp Business API · Email (SendGrid)
- **PDF:** Puppeteer-based bulletin & receipt generation

## Quick Start

```bash
# 1. Start PostgreSQL & Redis
npm run docker:up

# 2. Set up backend env
cp backend/.env.example backend/.env
# Edit backend/.env — at minimum set JWT_SECRET and JWT_REFRESH_SECRET

# 3. Migrate & seed database
npm run db:migrate
npm run db:seed

# 4. Run dev servers (backend + frontend)
npm run dev
```

- API:       http://localhost:4000/api
- API docs:  http://localhost:4000/api/docs
- Frontend:  http://localhost:5173
- MailHog:   http://localhost:8025

## Default Credentials

After seeding:
- **Admin:** admin@demo.novabulletin.local / Admin@123

## Project Structure

- `backend/`  — NestJS API with module-based architecture
- `frontend/` — React app with hybrid SCSS architecture
- `shared/`   — Shared enums, constants, and grade calculations
- `docs/`     — Architecture decisions, guides, API spec

## Key Features

- Multi-tenant schools with custom branding (logo, colors, fonts, stamps)
- Togolese curriculum (Maternelle → Terminale + all Lycée series)
- Flexible term system: Trimestre / Semestre / Custom
- Dynamic coefficients (teacher enters any value)
- Fee management (per-class fees, mobile money payments)
- **Fee-gated bulletin delivery:** WhatsApp + Email PDF only when fees are paid
- Auto-release notifications when payment is recorded
- Bilingual (FR/EN) UI, emails, WhatsApp templates, and PDFs

## License

Proprietary
READMEEOF

# Docs
touch docs/architecture/overview.md
touch docs/architecture/data-model.md
touch docs/architecture/notification-flow.md
touch docs/architecture/deployment.md
touch docs/api/endpoints.md
touch docs/guides/getting-started.md
touch docs/guides/whatsapp-setup.md
touch docs/guides/email-setup.md
touch docs/decisions/001-nestjs-over-express.md
touch docs/decisions/002-hybrid-css-architecture.md
touch docs/decisions/003-fee-gate-as-school-toggle.md

log_success "Root config files written"

# ============================================================================
# DONE
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NovaBulletin scaffolding complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  npm run docker:up"
echo "  cp backend/.env.example backend/.env"
echo "  npm run db:migrate"
echo "  npm run db:seed"
echo "  npm run dev"
