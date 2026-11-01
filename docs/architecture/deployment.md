# Deployment

Production as of November 2026:

| Part | Host | Address |
|---|---|---|
| Frontend (web app, PWA) | Vercel | https://e-report-frontend.vercel.app |
| Backend API | Render — Docker web service `novabulletin-api`, region **Frankfurt**, free plan | https://novabulletin-api.onrender.com/api |
| Database | Supabase PostgreSQL, `aws-0-eu-west-1` (Ireland) | — |
| Files (logos, photos, PDFs) | Cloudinary | — |
| Mobile app | Expo EAS, project `@felixatoma23/novabulletin` | APK builds on expo.dev |

Frankfurt was chosen because it is the Render region closest to the database: API calls are 2–3× faster than from Oregon.

## Releasing

Push to `main`. That is the whole release:

- **Vercel** builds `frontend/` (`vite build`) and publishes it within a couple of minutes.
- **Render** builds `backend/Dockerfile` and replaces the running server once the new one answers `/api/health`. If the new build fails, the previous version keeps running.

Open browser tabs pick up the new frontend when the user returns to the tab or clicks a link, and at the latest at the hourly check. The browser console shows the deployed commit: `Version <commit> · <build date>`.

## Backend on Render

The service is built from `backend/Dockerfile` (two stages, Node 20 Alpine, Chromium and Liberation/DejaVu fonts for PDFs). At startup the container runs:

```
npx prisma db push --skip-generate   # bring the database up to the schema (additive only)
node dist/main                       # start the API
```

`render.yaml` at the repository root describes an older non-Docker setup. The live service does **not** use its build command; the Dockerfile is what counts.

### Database changes

`prisma db push` runs on every start, without `--accept-data-loss`:

- additive changes (new table, new column with a default, new enum value) are applied automatically — the log shows `Your database is now in sync with your Prisma schema` (or `already in sync`);
- a change that would lose data (drop, rename, type change) is **refused**: the log shows `PRISMA DB PUSH FAILED`, the server still starts on the old schema. Plan such changes as a manual migration, run against `DIRECT_URL`, before deploying the code that needs them.

Read-only check of what a deploy would change, from `backend/` (run Prisma through Node, not a shell, because the URL contains `&`):

```bash
node ../node_modules/prisma/build/index.js migrate diff \
  --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script
```

`-- This is an empty migration.` means production already matches.

### Staying awake

The free plan puts a service to sleep after 15 minutes without traffic; the next visitor then waits 30–60 s, and scheduled jobs do not run while asleep. The server calls its own `/api/health` every 10 minutes when `RENDER_EXTERNAL_URL` is set (Render sets it), which keeps it awake. A free Render workspace has 750 hours a month: enough for **one** service running all month — keep only one free service per Render account.

### Environment variables

Set in Render → `novabulletin-api` → Environment, then "Save, rebuild and deploy". Values are never stored in the repository.

| Group | Variables |
|---|---|
| Runtime | `NODE_ENV=production`, `GLOBAL_PREFIX=api`, `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`, `PUPPETEER_SKIP_DOWNLOAD=true` |
| Database | `DATABASE_URL` (Supabase **session** pooler, port 5432 — the transaction pooler on 6543 is much slower), `DIRECT_URL` (direct connection, used by `prisma db push`) |
| Auth | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| URLs | `FRONTEND_URL` (also the CORS allow-list, comma-separated), `BASE_URL` |
| Files | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| E-mail | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `OWNER_EMAIL` — see [email-setup.md](../guides/email-setup.md) |
| WhatsApp / SMS | `WHATSAPP_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `SMS_PROVIDER`, `TWILIO_SMS_FROM`, `OWNER_WHATSAPP` — see [whatsapp-setup.md](../guides/whatsapp-setup.md) |
| Payments | `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` (required for schools to save online-payment keys), `PLATFORM_NOTCHPAY_PUBLIC_KEY`, `PLATFORM_NOTCHPAY_HASH_KEY` (live keys only), `OWNER_MOMO_NUMBER`, `OWNER_MOMO_OPERATOR`, `CINETPAY_API_KEY`, `CINETPAY_SITE_ID` |
| Subscription | `SUBSCRIPTION_*_XOF` prices, `SUBSCRIPTION_TRIAL_DAYS` (defaults in code if unset) |
| Optional | `ANTHROPIC_API_KEY` (AI assistant), `SENTRY_DSN` (error reports) |

The rate limit (100 requests per minute per client) is fixed in `backend/src/app.module.ts`; `THROTTLE_TTL` / `THROTTLE_LIMIT` in old `.env` files are not read.

Each integration logs whether it is on at startup (`Mail provider: SMTP`, `WhatsApp provider: Twilio`, `SMS not configured…`, `Cloudinary storage enabled`). Read the first lines of the deploy log after changing variables.

Changing `BASE_URL` or the service address also requires updating Google sign-in: Google Cloud console → APIs & Services → Credentials → OAuth client → **Authorised redirect URIs** must contain `https://<api-host>/api/auth/google/callback`.

## Frontend on Vercel

- Root directory `frontend/`, framework Vite, output `dist/`.
- `frontend/.env.production` holds `VITE_API_URL=https://novabulletin-api.onrender.com/api` (public, not a secret). Vite inlines it at build time: changing the API address means changing this file and redeploying.
- `frontend/vercel.json` rewrites every path to `index.html` (client-side routing).
- PWA: Workbox service worker with automatic update. `frontend/public/sw-api-redirect.js` redirects calls to former API hosts (`e-report-y4g9`, `e-report-c47o`) to the current one, so tabs left open on an old version keep working. Add the old host there whenever the API moves again.

## Database (Supabase)

- Region `eu-west-1`; connection strings in Supabase → Project settings → Database.
- Backups: Supabase daily backups on the free plan are limited — export important data regularly (`pg_dump` against `DIRECT_URL`).
- Never run destructive SQL from a development machine against production; scripts that change data must be reviewed first.

## Mobile app (Expo)

```bash
cd mobile
EXPO_TOKEN=<token> npx -y eas-cli@latest build -p android --profile preview --non-interactive
```

The API address is in `mobile/app.json` (`extra.apiUrl`) and `mobile/eas.json` (`EXPO_PUBLIC_API_URL` per build profile). The app is on Expo SDK 51; publishing on the Play Store requires upgrading the SDK first.

## Self-hosting on one server (alternative)

`deploy/server/` contains a kit for a single Linux VM (Google Cloud e2-micro or Oracle Cloud free tier): Docker Compose for the API, Caddy for HTTPS, `setup.sh` (adds swap on small machines) and `update.sh`. Instructions in French: [deploy/server/LISEZ-MOI.md](../../deploy/server/LISEZ-MOI.md). It is not used in production today.
