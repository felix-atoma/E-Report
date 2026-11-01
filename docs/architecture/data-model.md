# Data Model

The schema is `backend/prisma/schema.prisma` (55 models, PostgreSQL). This page explains the main models and how they connect; the schema file is the source of truth for every field.

Conventions:

- IDs are UUID strings; every model has `createdAt` / `updatedAt`.
- **Multi-tenant:** almost every record carries `institutionId`. Services always filter by the caller's institution.
- **School year** is a string like `"2026-2027"` (starts in September). **Term** is `termNumber` (1–3 for trimestres, 1–2 for semestres).
- Names: one `name` field (no first/last split). A student's display name is `student.user?.name ?? student.admissionNumber`.
- Money is `Decimal(12, 2)`, currency `XOF` by default.

## Core: schools, people, classes

```
Institution ─┬─ User (role: SUPERADMIN | ADMIN | TEACHER | BURSAR | PARENT | STUDENT)
             ├─ Student ── user (login, optional) · parent (User) · admissionNumber
             ├─ Class ──┬─ ClassStudent (student × class × academicYear)
             │          ├─ ClassSubject (class × subject × teacher)
             │          └─ teacherId → the titulaire (homeroom teacher)
             └─ Subject (nameFr / nameEn, maxScore 10 or 20, passMark, hasCoefficient)
```

| Model | Notes |
|---|---|
| `Institution` | `status` (PENDING → ACTIVE, or SUSPENDED / REJECTED — set by the super-admin); `academicSettings` JSON (term system, term dates, pass mark, fee gate…); `brandingSettings` JSON (names per cycle, logos, colours, director signature); subscription fields (`subscriptionStatus`, `subscriptionExpiry`…). |
| `User` | every login. `whatsappNumber` is used for WhatsApp **and** SMS; `language` FR / EN; `notificationPreferences` JSON. |
| `Student` | administrative file (parents' names and phones, health, birth details, photo). Linked to a `User` only if the student logs in. |
| `ClassStudent` | enrolment per school year — a student's class history. |
| `ClassSubject` | which subjects a class takes and **which teacher teaches each** (`teacherId`). This drives what a teacher may see, enter and sign. |

## Grades and report cards

```
GradeFiche (class × subject × year × term)  ← signature of the teacher
Grade (reportCard × subject)                 ← the marks
ReportCard (student × year × term)           ← the bulletin
```

| Model | Notes |
|---|---|
| `Grade` | one row per student × subject × term, attached to the student's `ReportCard`: `noteInterro1`–`noteInterro4`, `noteDevoir`, `noteComposition`, plus computed `moyenneMatiere`, `coefficient`, `rangMatiere`, `appreciation`. |
| `GradeFiche` | the signature of a grade sheet (class × subject × term): `signedAt`, `signedByName`, `signatureData` (handwritten signature image). Signing locks the sheet. Unique on (class, subject, year, term). |
| `ReportCard` | the bulletin. `status` DRAFT → REVIEW → PUBLISHED. Holds averages, rank, class statistics, attendance totals, conduct, council decision, titulaire and principal comments, `pdfUrl`. Unique on (student, year, term). |
| `Bulletin` | despite the name, **not** a report card: a school news item (title, content, audience). |

Flow: teachers fill and sign their `GradeFiche`s → when every sheet of the class is signed, a `ReportCard` per enrolled student moves to REVIEW → the titulaire adds comments and publishes → parents are notified.

## Exams and evaluations

| Model | Notes |
|---|---|
| `MockExam` | an exam session for one class: `examType` BLANC, CEPE, BEPC, BAC1, BAC2, DEVOIR_SURVEILLE, COMPOSITION_MENSUELLE (primary, out of 10), COMPOSITION_ANGLAIS; `status` DRAFT / PUBLISHED. |
| `MockExamGrade` | one mark per student × subject for a session. |
| `MockExamSubjectFiche` | signature of a session's subject sheet. |
| `CalendarEvent` | school calendar. Types INTERROGATION, DEVOIR, COMPOSITION, EXAM are **scheduled evaluations**: they drive the teacher "marks to enter" alerts and reminders. `classIds` (several classes) or `classId` (older events); both empty = all classes. |
| `NationalExamResult` | official CEPD / BEPC / BAC… results. |
| `ExamPaper` | exam papers written in the editor. |

## Fees and payments

| Model | Notes |
|---|---|
| `Fee` | a fee definition (tuition, exam fee…) for a year, optionally a term, level or class. |
| `StudentFee` | what one student owes for a fee (`amountDue`), or an exemption (`isExempt`). |
| `Payment` | money received: method (`CASH`, `MOBILE_MONEY_TMONEY`, `MOBILE_MONEY_FLOOZ`, `MOBILE_MONEY_MOMO`, `MOBILE_MONEY_ONLINE`, `BANK_TRANSFER`, `CHEQUE`, `OTHER`), `receiptNumber`, online references (FedaPay, NotchPay). |
| `PaymentPlan`, `PaymentPlanInstalment` | instalment schedules. |
| `PaymentIntent` | an online payment in progress. |
| `SubscriptionPayment` | a school paying its NovaBulletin subscription. |

Payment status of a student for a year = sum of `Payment.amount` vs sum of `StudentFee.amountDue`: PAID, PARTIAL, UNPAID, or EXEMPT. It decides whether report-card messages are held (see [notification-flow.md](notification-flow.md)).

## Notifications and security

| Model | Notes |
|---|---|
| `NotificationLog` | one row per report-card message × channel (`WHATSAPP`, `EMAIL`, `SMS`, `IN_APP`), with `status` PENDING, SENT, DELIVERED, FAILED, HELD_UNPAID, HELD_PARTIAL and the attempt count. Also the in-app notification list (`isRead`). |
| `RefreshToken`, `PasswordResetToken`, `WhatsappVerification` | auth support. |
| `AuditLog` | who changed what. |

## School life (one model each)

Attendance (`Attendance`), timetable (`TimetableSlot`), hours taught (`SubjectHoursLog`), programmes (`SubjectProgram`, `ProgramChapter`), announcements, course materials, assignments and submissions, quizzes (`Quiz`, `QuizQuestion`, `QuizOption`, `QuizAttempt`, `QuizAnswer`), discipline (`DisciplinaryRecord`), incidents (`IncidentReport`), health (`HealthRecord`), library loans, inventory, purchases, staff profiles, school documents, transfers, alumni, branding assets and report-card templates.

## Changing the schema

Edit `schema.prisma`, run `npx prisma db push` locally, commit. Production applies **additive** changes automatically at startup (new tables, columns with defaults, enum values). Renaming, dropping or changing a column type is refused at startup and must be planned as a manual migration — see [deployment.md](deployment.md#database-changes).
