# ADR 003 — Fee gate as a per-school setting

- **Status:** accepted, **partly implemented** (see "Current state")
- **Recorded:** November 2026, reconstructed from the code and the settings page — the original reasoning was not written down at the time.

## Context

In Togolese private schools, unpaid fees are the main financial problem. A common practice is to withhold the report card until fees are paid: parents come to pay to get the bulletin. Other schools (public schools, schools with a different policy, or at certain times of the year) want report cards delivered to everyone.

The rule therefore cannot be global: each school must choose.

## Decision

- Report-card delivery to parents depends on the student's **payment status** for the school year: `PAID` or `EXEMPT` → delivered; `PARTIAL` or `UNPAID` → held (`HELD_PARTIAL`, `HELD_UNPAID` in `NotificationLog`).
- A held message is **released automatically** as soon as a recorded payment brings the student to `PAID` (`PaymentsService.tryReleaseHeldNotifications`), and can be **force-sent** by the admin (Notifications → En attente).
- Each school can switch the gate on or off: `academicSettings.feeGateEnabled` (Admin → Paramètres → "Blocage des bulletins PDF", on by default).

## Current state (November 2026)

What the code actually does today differs from the setting's description in two ways:

1. **The switch is not read by the server.** `feeGateEnabled` is saved (`update-academic-settings.dto.ts`) and shown on the settings page, but `NotificationsService.handleReportPublished` holds messages for unpaid students regardless of its value. Turning it off has no effect.
2. **Only the messages are held, not the bulletin itself.** The setting says the PDF is blocked until payment, but `ReportsService.downloadPdf` lets the parent (and student) open the published PDF in the portal and the app whatever the payment status. What is held is the WhatsApp / e-mail / SMS message announcing it (with its PDF link); the in-app notification is always created.

To make the implementation match this decision:

- in `handleReportPublished`, read `institution.academicSettings.feeGateEnabled` (default `true`) and treat every student as deliverable when it is `false`;
- decide whether portal access should also be gated; if yes, check the payment status in `downloadPdf` (and the report detail endpoint) for `PARENT` / `STUDENT` when the gate is on, with a clear message ("Bulletin disponible après règlement des frais").

## Consequences

**Good**

- Schools that rely on withholding bulletins get it with no manual work, and release is automatic on payment.
- The bursar and admin see every held bulletin in one list, with a payment-link shortcut.

**Costs**

- Payment status is computed per school year over all fee lines; a school that only wants to require the current term's fees cannot express that today.
- Until the gaps above are fixed, the settings page promises behaviour the server does not provide.
