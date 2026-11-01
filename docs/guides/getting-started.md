# Getting Started

How to run NovaBulletin on your own machine for development.

## What you need

| Tool | Version | Used for |
|---|---|---|
| Node.js | 20 (the production image uses `node:20-alpine`) | backend and frontend |
| npm | 10+ | workspaces (`backend`, `frontend`, `shared`) |
| Docker Desktop | any recent | local PostgreSQL, Redis and MailHog (optional — see below) |
| Git | any | |

Chromium is only needed to generate PDFs (report cards, receipts, class lists). Puppeteer downloads its own copy on `npm install` unless `PUPPETEER_SKIP_DOWNLOAD=true` is set.

## 1. Install

```bash
git clone <repository-url> E-Report
cd E-Report
npm install            # installs backend, frontend and shared in one go (npm workspaces)
```

## 2. Choose a database

**Option A — local Docker database (recommended for a clean start)**

```bash
npm run docker:up      # PostgreSQL 14 on :5432, Redis 7 on :6379, MailHog on :1025 / :8025
```

**Option B — a Supabase (or any PostgreSQL) database**

Use a separate project from production. Never point a development machine at the production database: background jobs (notification dispatch every 5 minutes, fee and evaluation reminders) run in every server you start and would send real messages.

## 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`. The minimum to start:

| Variable | Value for local development |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/novabulletin` (Docker) or your test database |
| `DIRECT_URL` | same as `DATABASE_URL` locally; on Supabase, the direct (non-pooled) connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | two different long random strings |
| `FRONTEND_URL` | `http://localhost:3000` |
| `BASE_URL` | `http://localhost:4000` |

Everything else is optional. Without them the matching feature switches itself off and says so in the startup log:

- no `SMTP_HOST` → e-mails are only logged ("No SMTP configured");
- no `WHATSAPP_PROVIDER` / `SMS_PROVIDER` → WhatsApp and SMS are off;
- no `CLOUDINARY_*` → uploads are stored on disk in `UPLOADS_DIR`;
- no `ANTHROPIC_API_KEY` → the AI assistant is off;
- no `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` → schools cannot save online-payment credentials (the server refuses to store them unencrypted).

See [email-setup.md](email-setup.md) and [whatsapp-setup.md](whatsapp-setup.md) to turn messaging on.

## 4. Configure the frontend

```bash
cp frontend/.env.example frontend/.env.local
```

Set `VITE_API_URL=http://localhost:4000/api`. The app refuses to start its API client without it.

## 5. Create the tables and demo data

```bash
cd backend
npx prisma db push     # creates/updates tables from prisma/schema.prisma (same as production)
npm run prisma:seed    # demo school, users, classes, subjects, students
cd ..
```

Production applies the schema with `prisma db push` at startup (see [deployment.md](../architecture/deployment.md)), so `db push` keeps your database in the same shape. The `prisma/migrations` folder exists but is not what production uses.

Demo accounts created by the seed (all at the school "Lycée Démonstration NovaBulletin"):

| Role | E-mail | Password |
|---|---|---|
| Administrator | `admin@demo.novabulletin.local` | `Admin@123` |
| Teacher | `kofi.agbesi@demo.novabulletin.local` | `Teacher@123` |
| Bursar, parents, students | see `backend/prisma/seed.ts` | `Bursar@123`, `Parent@123`, `Student@123` |

To create the platform owner account (SUPERADMIN), from `backend/`:

```bash
SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='a-strong-password' npx ts-node prisma/create-superadmin.ts
```

## 6. Run

```bash
npm run dev            # backend (watch mode) + frontend together
```

| What | Address |
|---|---|
| Frontend | http://localhost:3000 (Vite proxies `/api` to the backend) |
| API | http://localhost:4000/api |
| API docs (Swagger) | http://localhost:4000/api/docs — only when `NODE_ENV` is not `production` |
| MailHog (captured e-mails) | http://localhost:8025 — set `SMTP_HOST=localhost`, `SMTP_PORT=1025` |

Run one side only with `npm run dev:backend` or `npm run dev:frontend`.

## Useful commands

| Command | Where | What it does |
|---|---|---|
| `npm run build` | root | builds backend then frontend |
| `npm run lint` | root | ESLint on both |
| `npm test` | `backend/` | Jest unit tests |
| `npm test` | `frontend/` | Vitest |
| `npm run db:studio` | root | Prisma Studio (browse the database) |
| `npm run prisma:seed-at-risk` | `backend/` | adds "at-risk student" demo data |
| `npm run bulletins:regenerate` | `backend/` | regenerates bulletin PDFs |

## Project layout

```
backend/    NestJS API (TypeScript, Prisma). One folder per feature in src/modules/
frontend/   React + Vite web app (installable PWA). Pages in src/pages/<role>/
mobile/     Expo (React Native) app for parents, students and teachers
shared/     code shared between backend and frontend
docs/       this documentation, user manuals per role
deploy/     self-hosting kit for a single VM (Docker + Caddy)
```

Next: [architecture overview](../architecture/overview.md).
