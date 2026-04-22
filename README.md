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
