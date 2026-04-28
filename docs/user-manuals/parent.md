# Parent Manual

As a Parent you can view your children's report cards, track notifications, and read school announcements. Your access is limited to your own children's data.

---

## 1. Your Notifications

`GET /api/notifications/mine`

This is the first thing to check. Notifications tell you when a new report card is available for your child.

### Notification types

| Status | Meaning |
|---|---|
| `PENDING` | Notification queued — you will receive it via WhatsApp or Email shortly |
| `SENT` | Delivered to your WhatsApp or Email |
| `FAILED` | Delivery failed — contact the school to resend |
| `HELD_UNPAID` | Bulletin is ready but **no payment** has been recorded yet |
| `HELD_PARTIAL` | Bulletin is ready but a **partial payment** is outstanding |

### What "held" means
When the school uses fee-gated delivery, your child's bulletin is prepared the moment the teacher publishes it, but it is only sent to you after the school fees are settled. You will see an in-app notice telling you the bulletin is available pending payment.

Once the Bursar records your full payment, the bulletin is released automatically and you receive it via WhatsApp and/or Email — usually within minutes.

---

## 2. Report Cards

`GET /api/reports`

Lists all published report cards for your children.

`GET /api/reports/:id`

Full report card detail including:

| Field | Description |
|---|---|
| `termName` | e.g. `1er Trimestre` |
| `academicYear` | e.g. `2024-2025` |
| `overallAverage` | Moyenne générale (0–20) |
| `mention` | Excellent / Très Bien / Bien / Assez Bien / Passable / Insuffisant |
| `classRank` | Position in class |
| `classSize` | Total students ranked |
| `teacherComment` | Class teacher's remark |
| `attendanceDays` | School days in the term |
| `attendancePresent` | Days your child attended |
| `grades` | Per-subject scores and teacher comments |
| `pdfUrl` | Link to download the PDF bulletin (available once fees are settled) |

---

## 3. Grades Breakdown

Each subject entry in the report card shows:

| Field | Description |
|---|---|
| `subject.nameFr` | Subject name in French |
| `score` | Score out of 20 |
| `coefficient` | Weight of this subject |
| `teacherComment` | Optional remark from the subject teacher |

The `overallAverage` is calculated as:

```
Moyenne = Σ (score × coefficient) / Σ coefficients
```

---

## 4. Announcements

`GET /api/bulletins`

School-wide announcements published by the administration. Check here for term calendars, exam schedules, school events, and fee deadlines.

---

## 5. Your Profile

`GET /api/auth/me` — view your current profile

`PATCH /api/users/:id` — update your name, email, or WhatsApp number

**Important:** Keep your WhatsApp number up to date. This is the primary channel through which your child's report card PDF is delivered to you.

---

## 6. Frequently Asked Questions

**Why haven't I received my child's bulletin?**
Check `GET /api/notifications/mine`. If a notification shows `HELD_UNPAID` or `HELD_PARTIAL`, it means there are outstanding fees. Contact the school Bursar to settle the balance — the bulletin will be sent automatically once the payment is recorded.

**Can I download the PDF directly?**
Yes — once the notification is `SENT`, the report card's `pdfUrl` field contains a direct link to the PDF.

**What if my WhatsApp number is wrong?**
Update it via `PATCH /api/users/:id` and ask the Admin or Bursar to force-resend the notification.
