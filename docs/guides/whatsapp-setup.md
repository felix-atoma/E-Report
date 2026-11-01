# WhatsApp and SMS Setup

WhatsApp is the main channel to reach parents and teachers in Togo; SMS is the fallback. Both go through a provider configured on the server:

- WhatsApp: **Twilio** or **Meta Cloud API** — `backend/src/modules/whatsapp/whatsapp.service.ts`
- SMS: **Twilio** — `backend/src/modules/sms/sms.service.ts`

A step-by-step guide in French for the platform owner (paid account, sender name, Ghana registration, WhatsApp Business, costs) is available **to the super-admin only**: super-admin dashboard → **📘 Guide Twilio (SMS / WhatsApp)**. The file is `backend/assets/guides/guide-twilio-sms-whatsapp.pdf`, served by `GET /api/superadmin/guides/twilio` (SUPERADMIN role) — it is not part of the public website.

## What is sent

| Message | To | Channels |
|---|---|---|
| Report card published (with PDF link) | parent | WhatsApp, SMS (if enabled), e-mail, in-app — held while fees are unpaid |
| Fee reminder (friendly / urgent) | parent | WhatsApp, SMS, e-mail |
| Online payment link | parent | WhatsApp |
| Marks to enter / late | teacher | WhatsApp, else SMS, else e-mail |
| New school registered | platform owner (`OWNER_WHATSAPP`) | WhatsApp |

Details of when each one goes out: [notification-flow.md](../architecture/notification-flow.md).

## Option 1 — Twilio (used in production)

| Variable | Value |
|---|---|
| `WHATSAPP_PROVIDER` | `TWILIO` |
| `TWILIO_ACCOUNT_SID` | from the Twilio console (starts with `AC`) |
| `TWILIO_AUTH_TOKEN` | from the Twilio console |
| `TWILIO_WHATSAPP_FROM` | the WhatsApp-enabled sender, e.g. `+228XXXXXXXX` |
| `SMS_PROVIDER` | `TWILIO` (to enable SMS) |
| `TWILIO_SMS_FROM` | the SMS sender number |
| `OWNER_WHATSAPP` | your own number, to be told about new schools |

All three Twilio values must be present, otherwise the provider stays off and the log says `WhatsApp not configured — messages will be logged only`.

**Sandbox number.** Twilio's shared sandbox number (`+1 415 523 8886`) only delivers to phones that have joined the sandbox. NovaBulletin treats it as "not configured" for automatic sending, so schools are offered to send from their own phone instead. Use a registered WhatsApp sender for real use.

**24-hour rule.** WhatsApp only accepts free-text messages from a business within 24 hours of the person's last message. Outside that window a pre-approved **message template** is required. NovaBulletin currently sends free text (`Body`), so messages to people who have never written to the school's number may be refused by WhatsApp — Twilio reports this after the fact (error 63016), not at send time. Before scaling up, create and get approval for templates (report card ready, fee reminder, marks to enter) in the Twilio console.

## Option 2 — Meta Cloud API

| Variable | Value |
|---|---|
| `WHATSAPP_PROVIDER` | `META` |
| `WHATSAPP_PHONE_NUMBER_ID` | from Meta Business → WhatsApp → API setup |
| `WHATSAPP_ACCESS_TOKEN` | a permanent system-user token (temporary tokens expire after 24 h) |

The same 24-hour rule applies. Meta sends documents (PDF) as real attachments; Twilio sends the link in the text.

## Phone numbers

- Parents' and teachers' numbers are read from the **WhatsApp number** of their account (`User.whatsappNumber`). For parents, the father's, mother's or emergency contact phone on the student record is used as a fallback for fee reminders.
- Numbers typed without a country code get the school's country code (`Institution.country`; Togo `+228`). Code: `backend/src/common/utils/phone.util.ts`.
- SMS goes to the same number as WhatsApp.

## Checking it works

1. After a deploy, the Render log shows `WhatsApp provider: Twilio` and `SMS provider: Twilio (from …)`.
2. Admin → **Notifications → Journal** lists every bulletin message with its status (`SENT`, `FAILED`, `HELD_UNPAID`, `HELD_PARTIAL`).
3. Admin → preview of tomorrow's teacher reminders: `GET /api/calendar/evaluation-reminders/preview` (nothing is sent).
4. Delivery problems after acceptance (template, unknown number, blocked) only appear in the Twilio console → Monitor → Messaging logs.

**Caution:** with no provider configured, bulletin messages are logged instead of sent but still marked `SENT`. A `SENT` status in the journal therefore only means "delivered" when the startup log shows a provider.
