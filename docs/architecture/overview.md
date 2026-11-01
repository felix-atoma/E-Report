# Architecture Overview

NovaBulletin is a school management platform built for the Togolese education system: grade sheets (fiches de notes), report cards (bulletins), fees, attendance, timetables, exams and parent communication. One deployment serves many schools (multi-tenant): every record belongs to an `Institution`.

## The pieces

```
 Browsers / installed PWA            Expo mobile app
 (admin, teacher, bursar,            (parent, student, teacher)
  parent, student)                          │
        │  HTTPS (JSON, JWT)                │
        ▼                                   ▼
 ┌──────────────────────────────────────────────────┐
 │  Frontend — React + Vite, hosted on Vercel        │
 │  e-report-frontend.vercel.app                      │
 └──────────────────────────────────────────────────┘
                        │ /api/*
                        ▼
 ┌──────────────────────────────────────────────────┐
 │  Backend — NestJS (Docker) on Render, Frankfurt   │
 │  novabulletin-api.onrender.com/api                 │
 │  · REST API (43 controllers, ~300 routes)          │
 │  · scheduled jobs (notifications, reminders)       │
 │  · PDF generation (Puppeteer + Chromium)           │
 └──────────────────────────────────────────────────┘
     │            │             │              │
     ▼            ▼             ▼              ▼
 PostgreSQL   Cloudinary    Twilio / Meta   SMTP (Gmail)
 (Supabase,   (logos,       (WhatsApp,      (e-mail)
  Ireland)     photos,       SMS)
               PDFs)
```

Hosting details: [deployment.md](deployment.md).

## Backend

- **NestJS 10 + TypeScript**, one module per feature in `backend/src/modules/` (auth, classes, students, grades, reports, bulletins, fees, payments, notifications, calendar, mock-exams, attendance, timetables…).
- **Prisma 5** over PostgreSQL. Schema: `backend/prisma/schema.prisma` — see [data-model.md](data-model.md).
- **Security is global** (`backend/src/app.module.ts`):
  - every route requires a valid JWT unless marked `@Public()`;
  - `@Roles(...)` restricts a route to roles (`SUPERADMIN`, `ADMIN`, `TEACHER`, `BURSAR`, `PARENT`, `STUDENT`);
  - a rate limiter (`@nestjs/throttler`) protects all routes;
  - services check that the record belongs to the caller's institution (and, for teachers, to their classes/subjects).
- **Auth:** e-mail + password (bcrypt) issuing an access token and a refresh token; Google sign-in; one-time codes for first login and admin two-step login.
- **Events** (`@nestjs/event-emitter`) link modules without direct calls: `fiche.signed` → bulletins prepared; `report.published` → parent notifications; `grades.corrected` → published bulletins recomputed.
- **Scheduled jobs** (`@nestjs/schedule`): notification dispatch every 5 minutes, fee reminders, teacher evaluation reminders. See [notification-flow.md](notification-flow.md).
- **PDF:** `backend/src/modules/pdf/pdf.service.ts` renders HTML to PDF with Puppeteer (report cards, receipts, class lists, relevés, student cards).
- **AI assistant** (optional): Claude via the Anthropic SDK, for help questions and draft teacher comments.

API reference: [endpoints.md](../api/endpoints.md). Swagger UI at `/api/docs` outside production.

## Frontend

- **React 18 + Vite**, JavaScript. Pages are grouped by role in `frontend/src/pages/<role>/` and lazy-loaded from `frontend/src/routes/AppRouter.jsx`; `ProtectedRoute` checks the role.
- **Data:** TanStack Query over an Axios client (`frontend/src/services/api.js`), which adds the JWT and refreshes it on expiry. One small service file per API area (`calendarService.js`, `gradesService.js`…).
- **Styles:** SCSS design tokens + one plain CSS file per component — see [ADR 002](../decisions/002-hybrid-css-architecture.md).
- **i18n:** French (default) and English with i18next (`frontend/src/locales/{fr,en}/common.json`).
- **PWA:** installable, works offline on the last data seen (vite-plugin-pwa / Workbox). New versions load automatically; `public/sw-api-redirect.js` sends calls aimed at old server addresses to the current one.

## Mobile

`mobile/` is an Expo (React Native) app built with EAS, talking to the same API. It covers parents, students and teachers; administration stays on the web.

## Togolese school system in the code

- **Levels:** primary (CI → CM2, marks often out of 10, monthly compositions) and secondary (6ème → Terminale, out of 20, devoirs surveillés). Helpers: `frontend/src/utils/examKinds.js`, `isPrimaryLevel` in the PDF service.
- **Terms:** trimestres (default) or semestres, with dates configurable per school (`academicSettings.termDates`).
- **Grade sheet (fiche de notes):** per class × subject × term — Interro 1–4, Devoir, Composition — signed by the teacher. When every sheet of a class is signed, report cards are prepared for the titulaire to review and publish.
- **Fee gate:** report cards are delivered to parents only once fees are paid — see [ADR 003](../decisions/003-fee-gate-as-school-toggle.md).
