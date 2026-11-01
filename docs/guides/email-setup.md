# E-mail Setup

NovaBulletin sends e-mail through any SMTP server (code: `backend/src/modules/mail/mail.service.ts`). Production uses a Gmail account.

## What is sent by e-mail

| E-mail | Sent to | Trigger |
|---|---|---|
| Report card published | parent | bulletin published (held while fees are unpaid — see [notification-flow.md](../architecture/notification-flow.md)) |
| Fee reminder | parent | weekly / daily reminder jobs, or the "Rappeler" buttons |
| Payment receipt | parent | payment recorded |
| Marks to enter / late | teacher | daily evaluation reminder, when the teacher has no WhatsApp/SMS delivery |
| Welcome code, password reset, admin login code | user | account creation, "forgot password", admin two-step login |
| School registration, approval, trial expiry, subscription confirmation | school / platform owner | super-admin flow |

## Configuration

Set these on the server (`backend/.env` locally, Render → Environment in production):

| Variable | Example | Notes |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | **Required.** Without it, e-mails are only written to the log. |
| `SMTP_PORT` | `587` | default `587` |
| `SMTP_SECURE` | `false` | `true` only for port `465` |
| `SMTP_USER` | `school.account@gmail.com` | the sending mailbox |
| `SMTP_PASS` | app password | see below — never your normal password |
| `MAIL_FROM` | `NovaBulletin <school.account@gmail.com>` | display name and address shown to recipients |
| `OWNER_EMAIL` | `you@example.com` | platform owner: receives new-school registrations |
| `FRONTEND_URL` | `https://e-report-frontend.vercel.app` | used to build links in e-mails |

On startup the server logs either `Mail provider: SMTP (smtp.gmail.com)` or `No SMTP configured — emails will be logged only`.

## Gmail

1. Use a dedicated Gmail account for the platform, not a personal one.
2. Turn on **2-Step Verification** (Google Account → Security).
3. Create an **App password** (Google Account → Security → App passwords), name it "NovaBulletin".
4. Put the 16-character app password in `SMTP_PASS` (no spaces), the address in `SMTP_USER` and `MAIL_FROM`.

Gmail limits a normal account to about 500 recipients per day. Bulletin publication for a whole school can approach that; beyond it, use a transactional provider that offers SMTP (Brevo, Mailgun, SendGrid…) with the same variables.

## Local testing with MailHog

`npm run docker:up` starts MailHog. Set:

```
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

Every e-mail is captured (nothing leaves your machine) and visible at http://localhost:8025.

## Checking delivery

- Bulletin e-mails are tracked per parent in the `NotificationLog` table (channel `EMAIL`, status `SENT` / `FAILED`) and in Admin → **Notifications → Journal**.
- Other e-mails are logged by the server only (`[MailService]` lines in the Render logs).
- A message landing in spam usually means `MAIL_FROM` does not match `SMTP_USER`, or the domain has no SPF/DKIM — with a custom domain, configure both at the provider.
