# Notification Flow

Who gets told what, when, and through which channel. Times are Lomé time (UTC+0). Scheduled jobs only run while the API is awake — see [deployment.md](deployment.md#staying-awake).

## 1. Report cards (bulletins) → parents

```
Teacher signs grade sheet ──► event "fiche.signed"
                                   │ all sheets of the class signed?
                                   ▼
                     ReportCard per student → REVIEW
                                   │ titulaire adds comments, publishes
                                   ▼
                          event "report.published"
                                   │
              NotificationsService.handleReportPublished
                                   │ payment status of the student for the year
                 ┌─────────────────┴──────────────────┐
           PAID / EXEMPT                       PARTIAL / UNPAID
                 │                                    │
     NotificationLog rows: PENDING        IN_APP: PENDING
     (IN_APP, WHATSAPP, EMAIL,            WHATSAPP / EMAIL / SMS:
      + SMS if a provider is set)         HELD_PARTIAL or HELD_UNPAID
                 │                                    │
                 │                    payment recorded → fully paid?
                 │                    PaymentsService.tryReleaseHeldNotifications
                 │                                    │ HELD_* → PENDING
                 ▼                                    ▼
      Job every 5 minutes: dispatchPendingNotifications
      (50 at a time; one run at a time)
                 │
      e-mail / WhatsApp / SMS with average, mention and PDF link
                 ▼
      SENT  or  FAILED
```

- Code: `backend/src/modules/notifications/notifications.service.ts`, `backend/src/modules/reports/reports.service.ts`, `backend/src/modules/payments/payments.service.ts`.
- **Payment status:** sum of payments vs sum of fees due for the school year. Any exemption → EXEMPT; nothing due → PAID.
- **Recipient:** the parent linked to the student (`Student.parent`). No parent account → no message.
- **Admin overrides:** Admin → **Notifications → En attente** lists HELD messages; "force send" releases one without payment, and a WhatsApp payment link can be sent to the parent.
- **Statuses** are visible in Admin → **Notifications → Journal**. `FAILED` is not retried automatically.
- **Caution:** with no provider configured for a channel, the message is only logged but still marked `SENT`.

## 2. Fee reminders → parents

`backend/src/modules/fees/fee-reminders.service.ts`

| When | Tone | Who |
|---|---|---|
| Every Monday 9:00 | friendly | parents with a balance, once `FEE_REMINDER_FRIENDLY_AFTER_MONTHS` (default 1) months have passed since the start of the school year |
| Every day 8:00 | urgent (exclusion warning) | same, after `FEE_REMINDER_URGENT_AFTER_MONTHS` (default 2) months |
| On demand | friendly | students chosen on the payments page ("Rappeler") |

Channels: WhatsApp, SMS and e-mail as available. Phone: the parent's account number, else the father's, mother's or emergency contact phone from the student record. On-demand reminders that cannot be sent automatically come back as ready-to-send text for the school's own phone.

## 3. Evaluations → teachers

The admin schedules an Interrogation, Devoir, Composition or Examen in the school calendar (one, several or all classes). Code: `backend/src/modules/calendar/`.

**Which sheets each teacher must fill:** subjects assigned to them in `ClassSubject`, plus subjects without a teacher in classes where they are titulaire. Column checked:

| Evaluation | Column of the term's grade sheet | Done when |
|---|---|---|
| n-th interrogation of the term for that class (by date) | Interro n (max 4) | every enrolled student has a mark |
| Devoir | Devoir | every enrolled student has a mark |
| Composition, Examen | Composition | every student has a mark **and** the sheet is signed |

The signature is only required at the composition because signing locks the whole term's sheet and, once a class's last sheet is signed, prepares the report cards.

**Dashboard** (`GET /api/calendar/my-evaluations`): from 7 days before to 30 days after the evaluation, the teacher sees each incomplete sheet with its progress ("12/50 notes" or "Fiche à signer") and a link to it. 3 days after the evaluation it turns red and pulses. It disappears once every sheet is done.

**Daily reminder, 7:00** (`EvaluationRemindersService`): one message per teacher listing their incomplete sheets — the day after the evaluation, then on day 3 and every 3 days until day 30. WhatsApp, else SMS, else e-mail. The admin can preview tomorrow's reminders without sending: `GET /api/calendar/evaluation-reminders/preview`.

## 4. Other messages

| Message | Channel | Trigger |
|---|---|---|
| Welcome code / set password | e-mail | account created |
| Admin login code | e-mail | admin two-step login |
| Password reset | e-mail | "Mot de passe oublié" |
| Payment receipt | e-mail | payment recorded |
| Online payment link | WhatsApp | bursar/admin sends a link |
| New school registered | WhatsApp + e-mail to the platform owner | school signs up |
| School approved, trial ending, trial ended, subscription confirmed | e-mail | super-admin actions and subscription jobs |
