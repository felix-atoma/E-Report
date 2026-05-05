# NovaBulletin — Complete Workflow Documentation

> A school management platform for the Togolese curriculum: report cards, grades, fees, and parent notifications.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [User Roles](#2-user-roles)
3. [Technology Stack](#3-technology-stack)
4. [Data Models](#4-data-models)
5. [Authentication Workflow](#5-authentication-workflow)
6. [Grade Entry & Fiche de Notes Workflow](#6-grade-entry--fiche-de-notes-workflow)
7. [Report Card Lifecycle: DRAFT → REVIEW → PUBLISHED](#7-report-card-lifecycle-draft--review--published)
8. [Fee-Gated Notification Delivery](#8-fee-gated-notification-delivery)
9. [PDF Generation](#9-pdf-generation)
10. [Fee & Payment Workflow](#10-fee--payment-workflow)
11. [Admin Workflows](#11-admin-workflows)
12. [Teacher Workflows](#12-teacher-workflows)
13. [Parent Workflows](#13-parent-workflows)
14. [Student Workflows](#14-student-workflows)
15. [Bursar Workflows](#15-bursar-workflows)
16. [API Reference by Module](#16-api-reference-by-module)
17. [Frontend Pages by Role](#17-frontend-pages-by-role)
18. [Key Business Rules](#18-key-business-rules)

---

## 1. Project Overview

NovaBulletin is a multi-tenant web application for schools in Togo (and similar African education systems). It digitizes the entire report card process:

- Teachers enter grades per subject per student per term
- Teachers sign their grade sheets (fiche de notes) electronically
- Admins publish report cards once all grade sheets are signed
- Report cards are automatically sent to parents via WhatsApp/Email — but only if school fees are paid
- Parents can view grades, download PDFs, and track payment history

The system follows the **Togolese national curriculum** grading formula and supports the standard three-term (Trimestre) or two-semester (Semestre) school year.

---

## 2. User Roles

| Role      | What they can do |
|-----------|-----------------|
| `ADMIN`   | Full access: manage users, classes, subjects, fees, payments, publish reports, configure institution |
| `TEACHER` | Enter grades for their classes, sign fiches, create/submit report cards, manage programs and bulletins |
| `BURSAR`  | Record and manage payments, view held notifications, manage fees |
| `PARENT`  | View published report cards for their children, view payment history, configure notification preferences |
| `STUDENT` | View their own published report cards, view announcements |

**Access Control:** Every API route is protected by `@Roles(...)` decorator + `RolesGuard`. Every route also requires a valid JWT token (`JwtAuthGuard`). All data is scoped to the user's `institutionId` (multi-tenant).

---

## 3. Technology Stack

### Backend (`/backend`)
- **NestJS** (TypeScript) — modular REST API
- **Prisma ORM** — database schema, migrations, query builder
- **PostgreSQL** — relational database
- **JWT + Refresh Tokens** — authentication
- **EventEmitter2** — async event-driven workflows (e.g., `report.published`)
- **Handlebars** — PDF template rendering
- **Multer** — file uploads (logos, crests, student photos)
- **Swagger** — auto-generated API docs at `/api/docs`

### Frontend (`/frontend`)
- **React 18** — UI library
- **React Router v6** — page routing with role-based `ProtectedRoute`
- **TanStack React Query** — data fetching, caching, and cache invalidation
- **Axios** — HTTP client with automatic JWT injection and `{ success, data }` envelope unwrapping
- **React Hot Toast** — toast notifications
- **CSS Modules** — component-scoped styles

### Database Schema highlights
- All models include `institutionId` → true multi-tenancy
- Enums for `Role`, `ReportStatus`, `PaymentStatus`, `ConductRating`, `TermSystem`, `DayOfWeek`
- Composite unique keys used heavily: e.g., `(studentId, academicYear, termNumber)` on `ReportCard`

---

## 4. Data Models

### Core relationships

```
Institution
  └── User (ADMIN / TEACHER / BURSAR / PARENT / STUDENT)
  └── Class
        └── ClassStudent  (which students are enrolled this year)
        └── ClassSubject  (which subjects, which teacher)
        └── TimetableSlot
        └── SubjectProgram → ProgramChapter
        └── GradeFiche    (teacher sign-off per subject per term)
        └── ReportCard    (one per student per term)
              └── Grade   (one per subject)
  └── Student
        └── StudentFee
        └── Payment
        └── NotificationLog
  └── Subject
  └── Fee
  └── Bulletin
  └── BrandingAsset
```

### Key models explained

**Class**
Represents one class-year group (e.g., "6ème A, 2024-2025"). Has a main teacher (`teacherId`). Contains enrolled students via `ClassStudent` and subjects via `ClassSubject`.

**ClassSubject**
Junction between Class and Subject. Each row also records which teacher teaches that subject in that class (`teacherId`). This is used to control which teachers can access which grade fiches.

**ReportCard**
The report card for one student, one term. Starts as `DRAFT`, progresses to `REVIEW`, then `PUBLISHED`. Contains computed fields (`overallAverage`, `classRank`, `mention`) that are filled in at publish time.

**Grade**
One row per subject in a report card. Stores raw scores (`noteInterro1..4`, `noteDevoir`, `noteComposition`) and computed results (`moyenneMatiere`, `weightedScore`, `rangMatiere`, `appreciation`).

**GradeFiche**
Teacher sign-off record for one class × subject × term combination. When signed (`signedAt` is set), the grade sheet is locked. All fiches must be signed before the admin can publish.

**NotificationLog**
Tracks delivery of a report card notification to a recipient (parent or student). Can be `HELD_UNPAID` or `HELD_PARTIAL` if the student hasn't paid their school fees yet.

---

## 5. Authentication Workflow

```
User                     Frontend                    Backend
 │                           │                           │
 │── enters email/password ──►│                           │
 │                           │── POST /auth/login ───────►│
 │                           │                           │── verify password (bcrypt)
 │                           │                           │── create accessToken (15min JWT)
 │                           │                           │── create refreshToken (7d, stored in DB)
 │                           │◄── { accessToken, refreshToken, user } ──│
 │                           │── store tokens in localStorage           │
 │                           │                           │
 │── navigates to page ──────►│                           │
 │                           │── GET /any-endpoint ──────►│
 │                           │   Authorization: Bearer <token>          │
 │                           │                           │── JwtAuthGuard validates token
 │                           │                           │── RolesGuard checks user.role
 │                           │◄── response data ─────────│
```

**Token refresh flow:**
When the access token expires (401 response), the Axios interceptor automatically calls `POST /auth/refresh` with the refresh token, gets a new access token, and retries the original request. This is transparent to the user.

**Password reset:**
1. User calls `POST /auth/forgot-password` with their email
2. Backend generates a reset token (stored in `PasswordResetToken` table with expiry)
3. Reset link sent to email: `/reset-password?token=<token>`
4. User calls `POST /auth/reset-password` with new password + token
5. Password updated, token marked as used

---

## 6. Grade Entry & Fiche de Notes Workflow

This is the core teacher workflow. "Fiche de notes" = the official grade sheet for one subject in one class for one term.

### Step 1 — Teacher opens the grade entry page

Navigate to: `/teacher/classes/:classId/grades/:subjectId?academicYear=2024-2025&termNumber=1&termName=1er%20Trimestre`

The page calls:
```
GET /grades/class/:classId/subject/:subjectId?academicYear=2024-2025&termNumber=1
```

Response contains:
- All students enrolled in the class for that academic year
- Their existing grade data (if any was saved before)
- The subject's name and pass mark
- The fiche signature status (signed or unsigned)

**Access control:** A teacher can only access a fiche if they are the main class teacher (`Class.teacherId`) OR they teach that subject in the class (`ClassSubject.teacherId`). Admins have unrestricted access.

### Step 2 — Teacher enters grades

For each student, the teacher enters (all scores are out of 20):
- **Interrogation 1** (optional)
- **Interrogation 2** (optional)
- **Interrogation 3** (optional)
- **Interrogation 4** (optional)
- **Devoir surveillé** (supervised test, optional)
- **Composition** (final term exam, optional)

The UI computes in real time for each student:

```
Togolese Grade Formula:
─────────────────────────────────────────────────────────────────
1. meanInterro = average of all filled interrogation scores
2. weights:
   - interrogations weight = 1  (if any filled)
   - devoir weight        = 2  (if filled)
   - composition weight   = 3  (if filled)
3. moyenneMatiere = (meanInterro×1 + devoir×2 + composition×3)
                    ────────────────────────────────────────────
                          (1 + 2 + 3) [only filled components]
4. rangMatiere = rank of this student by moyenneMatiere (1 = best)
5. appreciation:
   ≥ 16 → "Très Bien"   ≥ 14 → "Bien"   ≥ 12 → "Assez Bien"
   ≥ 10 → "Passable"    < 10 → "Insuffisant"
─────────────────────────────────────────────────────────────────
```

### Step 3 — Teacher saves

```
PUT /grades/class/:classId/subject/:subjectId
Body: {
  academicYear: "2024-2025",
  termNumber: 1,
  termName: "1er Trimestre",
  grades: [
    { studentId, noteInterro1, noteInterro2, noteDevoir, noteComposition, coefficient, teacherComment }
    ...
  ]
}
```

The backend:
1. Creates or finds each student's `ReportCard` for that term
2. Upserts each `Grade` row with the new scores
3. Recomputes `moyenneMatiere`, `weightedScore`, `rangMatiere`, `appreciation` server-side
4. Returns the updated fiche

The teacher can save multiple times before signing.

### Step 4 — Teacher signs the fiche

When ready, the teacher clicks "Sign this grade sheet". A signature pad modal opens. The teacher draws their signature (Canvas element).

```
POST /grades/class/:classId/subject/:subjectId/sign?academicYear=2024-2025&termNumber=1
Body: { signatureData: "<base64-canvas-data>" }
```

Backend:
- Creates or updates the `GradeFiche` record
- Sets `signedAt = now`, `signedByName = teacher.name`, `signedById = teacher.id`, `signatureData = blob`
- The fiche is now **locked** — grades are read-only

### Step 5 — Unsigning (if corrections needed)

If a teacher needs to correct grades after signing (but before report publication):

```
DELETE /grades/class/:classId/subject/:subjectId/sign?academicYear=2024-2025&termNumber=1
```

Backend:
- Clears `signedAt`, `signedByName`, `signedById`
- Fiche is unlocked again
- **Cannot unsign after the report card is PUBLISHED**

### Fiche status overview

The class detail page shows a summary table:
- Each subject → signed ✅ or unsigned ⬜
- "N/M fiches signed" indicator
- Only when all are signed can the admin publish

---

## 7. Report Card Lifecycle: DRAFT → REVIEW → PUBLISHED

```
DRAFT ──────────────────► REVIEW ──────────────────► PUBLISHED
  │                          │                           │
  │ Teacher creates           │ Teacher submits           │ Admin publishes
  │ batch for class           │ (all fiches must          │ (fiches verified,
  │                           │  eventually be signed)    │  averages computed,
  │                           │                           │  PDF generated,
  │                           │                           │  notifications sent)
  │
  └── Teacher can edit grades, comments, attendance
  └── Admin can edit anytime until PUBLISHED
```

### Creating report cards (DRAFT)

Typically done by the admin before teachers start entering grades.

```
POST /reports
Body: {
  classId: "...",
  academicYear: "2024-2025",
  termNumber: 1,
  termType: "TRIMESTRE",
  termName: "1er Trimestre"
}
```

This creates one `ReportCard` (status=DRAFT) for **every student enrolled** in the class via `ClassStudent`. It uses `upsert` so it is safe to run twice.

### Editing a report card (DRAFT or REVIEW)

Teachers and admins can update:
```
PATCH /reports/:id
Body: {
  teacherComment: "...",
  principalComment: "...",
  conductRating: "BIEN",
  attendanceDays: 60,
  attendancePresent: 57,
  attendanceLate: 2,
  warnings: 0,
  commendations: 1,
  honorCouncil: true
}
```

### Submitting for review

```
PATCH /reports/:id/submit
```

Changes status: `DRAFT → REVIEW`. Can only be called on a DRAFT report.

### Publishing

Only admins can publish. This is the most important step.

```
PATCH /reports/:id/publish
```

**Pre-checks (backend):**
1. Report must be in `REVIEW` status
2. Fetches all `ClassSubject` records for the report's class
3. Fetches all `GradeFiche` records for classId + academicYear + termNumber
4. For every subject in the class, verifies `GradeFiche.signedAt != null`
5. If any fiche is unsigned: returns **400 error** listing the count of unsigned fiches

**On success, backend:**
1. Computes `overallAverage`:
   ```
   overallAverage = sum(grade.moyenneMatiere × grade.coefficient) / sum(grade.coefficient)
   ```
2. Fetches all other PUBLISHED reports in same class/year/term (sibling students)
3. Ranks all students by `overallAverage` descending → sets `classRank` and `classSize` for all
4. Computes `mention`:
   ```
   ≥ 18 → "Excellent"    ≥ 16 → "Très Bien"   ≥ 14 → "Bien"
   ≥ 12 → "Assez Bien"   ≥ 10 → "Passable"    < 10 → "Insuffisant"
   ```
5. Sets `status = PUBLISHED`, `publishedAt = now`
6. Starts PDF generation **in the background** (non-blocking)
7. Emits `report.published` event → triggers notification workflow

### After publishing

- Report is **frozen** — no more edits
- `overallAverage`, `classRank`, `classSize`, `classHighest`, `classLowest`, `classAverage`, `mention` are all set
- `pdfUrl` is set asynchronously once PDF generation completes
- Parent/student receive notifications (subject to fee-gate check)

---

## 8. Fee-Gated Notification Delivery

This is a critical business rule: **parents do not receive report card notifications until school fees are paid.**

### How it works

```
Report Published
     │
     ▼
NotificationLog created for:
  - Student (if has user account)
  - Parent (if linked)
     │
     ▼
Fee check for student:
  ┌──────────────────────────────────────────────┐
  │ totalDue  = sum of all StudentFee.amountDue  │
  │ totalPaid = sum of all Payment.amount        │
  │                                               │
  │ If student has isExempt=true on any fee:      │
  │   status = EXEMPT → send immediately          │
  │                                               │
  │ Else if totalPaid >= totalDue:                │
  │   status = PAID → send immediately            │
  │                                               │
  │ Else if totalPaid > 0:                        │
  │   status = HELD_PARTIAL → hold notification  │
  │                                               │
  │ Else (no payments):                           │
  │   status = HELD_UNPAID → hold notification   │
  └──────────────────────────────────────────────┘
     │
     ▼
If HELD: NotificationLog.status = HELD_UNPAID or HELD_PARTIAL
If PAID/EXEMPT: notification queued for WhatsApp/Email delivery
```

### When a payment is recorded

The `POST /payments` endpoint triggers automatic release:

1. Bursar records payment
2. Backend recalculates student's total fees vs. total payments
3. If student is now `PAID` or `EXEMPT`:
   - All `NotificationLog` records for that student with status `HELD_UNPAID` or `HELD_PARTIAL`
   - Updated to `PENDING` (ready to send)
   - Mail/WhatsApp services pick them up and deliver

### Admin force-release

Admin can bypass the fee check:
```
PATCH /notifications/:id/force-send
```
Sets status to `PENDING` regardless of payment status.

### Viewing held notifications

```
GET /notifications/held
```
Returns all notifications with status `HELD_UNPAID` or `HELD_PARTIAL`. Admins and Bursars use this to monitor which report cards haven't been delivered due to unpaid fees.

---

## 9. PDF Generation

PDF generation is **asynchronous** — it starts after publish and does not block the publish response.

### Process

1. Triggered by: `reports.service.ts → generateAndSavePdf()`
2. Fetches institution data: `name`, `address`, `phone`, `motto`, `logo`, `crest`, `stamp`
3. Fetches full report + all grades + fiche signatures
4. Passes data to `PdfService.generateReportCardPdf()`
5. Renders Handlebars HTML template (`/backend/src/modules/pdf/templates/report-card.hbs`)
6. Template includes:
   - Institution header (logo on left, name + motto in centre, crest on right)
   - Title bar: "BULLETIN DE NOTES — TRIMESTRE 1 — 2024-2025"
   - Student band: name, class, admission number, date of birth, rank
   - Grade table per subject: interrogations, devoir, composition, moyenne, coefficient, points, rank, appreciation
   - Stats row: general average, mention, class rank, class average, highest, lowest, conduct, absences
   - Teacher comment + principal comment
   - Signature blocks: main teacher, director, parent
7. Saves PDF file (cloud storage or local disk)
8. Updates `ReportCard.pdfUrl` with the file URL

### Browser print (frontend alternative)

In addition to server-generated PDFs, every published report card has a **print page** at `/reports/:id/print`. This renders the same data as an A4-sized HTML page. Users can print it or save as PDF via the browser's print dialog (Ctrl+P → Save as PDF).

This page is accessible to:
- Teachers (for their classes)
- Admins (all reports)
- Parents (their children's published reports)
- Students (their own published reports)

---

## 10. Fee & Payment Workflow

### Fee structures (Admin/Bursar)

Admin creates fee structures:
```
POST /fees
Body: {
  name: "Scolarité 6ème T1",
  feeType: "TUITION",
  amount: 45000,
  currency: "XOF",
  academicYear: "2024-2025",
  term: "1er Trimestre",
  appliesToLevel: "6eme"
}
```

Fee types: `TUITION`, `REGISTRATION`, `EXAM`, `CANTEEN`, `TRANSPORT`, `OTHER`

### Assigning fees to students

```
POST /fees/:id/assign-to-class
```

Creates a `StudentFee` record for every student in the class. Sets `amountDue = fee.amount`.

Individual students can be marked exempt:
```
PATCH /fees/student/:studentId/exempt
Body: { feeId: "...", reason: "Bourse scolaire" }
```

### Recording payments

```
POST /payments
Body: {
  studentId: "...",
  amount: 30000,
  paymentMethod: "CASH",
  academicYear: "2024-2025",
  term: "1er Trimestre",
  paymentDate: "2024-10-15",
  notes: "Payment at front desk"
}
```

Backend auto-generates: `receiptNumber = "REC-2024-00042"`.
Backend auto-triggers held notification release if student is now fully paid.

### Payment methods supported

`MOBILE_MONEY_TMONEY`, `MOBILE_MONEY_FLOOZ`, `MOBILE_MONEY_MOMO`, `BANK_TRANSFER`, `CASH`, `CHEQUE`, `OTHER`

### Student fee summary

```
GET /fees/student/:studentId/summary
```

Returns: `{ totalDue, totalPaid, balance, status: "PAID" | "PARTIAL" | "UNPAID" | "EXEMPT" }`

---

## 11. Admin Workflows

### Institution setup
1. Register at `/register` → creates Institution + admin user
2. Go to Settings (`/admin/settings`): fill in school name, address, phone, motto, mission
3. Go to Branding (`/admin/branding`): upload logo, crest, stamp
4. Go to Settings → Academic Settings: choose term system (TRIMESTRE/SEMESTRE), configure terms

### User management
1. Go to Users (`/admin/users`)
2. Create users: enter name, email, role, temporary password
3. For teachers: system assigns them to classes via class management
4. For parents: link to student via student profile

### Class setup
1. Go to Classes (`/admin/classes`) → Create class (name, level, academic year, main teacher)
2. Open class → Subjects tab → Assign subjects + teacher for each subject
3. Open class → Students tab → Enroll students

### Creating report cards for a term
1. Go to Reports (`/admin/reports`) → "New report batch"
2. Select class, academic year, term number
3. Click Create → system creates one DRAFT report card per enrolled student

### Publishing report cards
1. Wait for teachers to enter grades and sign all fiches
2. Open a report card in REVIEW status
3. Click "Publish" → system verifies all fiches are signed
4. If any unsigned: error message shows count
5. If all signed: report published, PDF generated, notifications queued

### Managing held notifications
1. Go to Notifications (`/admin/notifications`)
2. See all HELD_UNPAID / HELD_PARTIAL notifications
3. Can force-send individual ones if needed

### Analytics
1. Go to Analytics (`/admin/analytics`)
2. Dashboard shows: total students, teachers, classes, published reports
3. Payment summary: total fees due, collected, pending (in FCFA)
4. Report status breakdown: DRAFT / REVIEW / PUBLISHED counts

---

## 12. Teacher Workflows

### Viewing my classes
1. Go to My Classes (`/teacher/classes`)
2. Shows only classes where teacher is `Class.teacherId` or `ClassSubject.teacherId`
3. Click a class → see students, subjects, timetable, fiche status

### Entering grades
1. In Class Detail → Subjects tab → click "✏️ Notes" on a subject
2. Select the term (1, 2, or 3)
3. Grade entry table opens with all enrolled students
4. Fill in scores per student (interrogations, devoir, composition)
5. UI auto-calculates moyenne, appreciation, rank in real time
6. Click "Save" to persist
7. Can save multiple times before signing

### Signing a fiche
1. Once grades are complete, click "Sign this grade sheet"
2. Signature pad opens → draw signature
3. Click "Sign" → fiche is locked
4. Grades are now read-only
5. Class detail page shows ✅ for this subject

### Submitting report cards
1. Go to Reports (`/teacher/reports`)
2. Open a DRAFT report card → click "Submit for review"
3. Status changes to REVIEW → admin is notified

### Creating bulletins
1. Go to Bulletins (`/teacher/bulletins`)
2. Write title + content, choose audience (ALL / PARENT / STUDENT)
3. Click Publish → announcement appears for target audience

### Defining subject curriculum
1. In Class Detail → click "📋 Programme" on a subject
2. Add chapters: title, objectives, duration
3. Mark chapters as completed as the year progresses

---

## 13. Parent Workflows

### Viewing children's report cards
1. Log in → My Children (`/parent/children`)
2. Select child → View reports (`/parent/children/:id/reports`)
3. Published report cards listed by term
4. If fees are not paid: report shows but with "Fees required" notice
5. If fees are paid: can view full grades + download/print PDF

### Understanding the fee banner
- If fees are UNPAID: red banner with outstanding balance
- If fees are PARTIAL: yellow banner with remaining balance
- If PAID or EXEMPT: no banner, full access to PDF

### Printing a report card
1. Click "🖨️ Imprimer / PDF" on a published report
2. A new browser tab opens with the print-ready A4 view
3. Use browser print dialog or Ctrl+P → "Save as PDF"

### Viewing payment history
1. Go to Payment History (`/parent/payments`)
2. Lists all payments recorded by the bursar for their child
3. Shows: date, amount, method, receipt number, term

### Setting notification preferences
1. Go to Notification Preferences (`/parent/notifications`)
2. Enable/disable: WhatsApp notifications, Email notifications
3. Verify WhatsApp number via OTP if not already verified

---

## 14. Student Workflows

### Viewing my report cards
1. Log in → My Reports (`/student/reports`)
2. Lists all published report cards (students never see DRAFT or REVIEW)
3. Each card shows: term, academic year, average, mention, class rank
4. Click to expand → see all subject grades, appreciations, teacher comment

### Printing a report card
1. Click "🖨️ Imprimer / PDF"
2. New tab opens with print-ready A4 view

### Viewing progress
1. Go to Progress (`/student/progress`)
2. Shows grade trends across terms and subjects

---

## 15. Bursar Workflows

### Recording a payment
1. Go to Payments (`/bursar/payments`)
2. Search for student by name or admission number
3. Select the fee and enter amount
4. Choose payment method (Cash, Mobile Money, etc.)
5. Click Record
6. System auto-generates receipt number
7. If student is now fully paid: held notifications are automatically released

### Assigning fees to a class
1. Go to Fees (`/bursar/fees`)
2. Open a fee record → "Assign to class"
3. Select class → creates StudentFee for all enrolled students

### Viewing held notifications
1. Go to Notifications (`/bursar/notifications`)
2. See students whose report card notifications are held due to unpaid fees
3. After recording payment, held notifications auto-release

---

## 16. API Reference by Module

### Authentication
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /auth/register | Public | Register institution + admin |
| POST | /auth/login | Public | Login, get tokens |
| GET | /auth/me | All | Get current user |
| POST | /auth/logout | All | Revoke refresh token |
| POST | /auth/refresh | Public | Refresh access token |
| POST | /auth/forgot-password | Public | Request password reset email |
| POST | /auth/reset-password | Public | Reset password with token |

### Users
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /users | ADMIN | List all users (filter by role) |
| GET | /users/teachers | ADMIN, TEACHER | List all teachers |
| POST | /users | ADMIN | Create user |
| GET | /users/:id | ADMIN | Get user |
| PATCH | /users/:id | ADMIN, self | Update user |
| POST | /users/:id/avatar | ADMIN, self | Upload avatar |
| PATCH | /users/:id/deactivate | ADMIN | Deactivate |
| PATCH | /users/:id/activate | ADMIN | Reactivate |

### Classes
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /classes | ADMIN, TEACHER | List classes (teachers see own only) |
| POST | /classes | ADMIN | Create class |
| GET | /classes/:id | ADMIN, TEACHER | Get class with students + subjects |
| PATCH | /classes/:id | ADMIN | Update class |
| POST | /classes/:id/enroll | ADMIN | Enroll student |
| DELETE | /classes/:id/students/:sid | ADMIN | Unenroll student |
| POST | /classes/:id/subjects | ADMIN | Assign subject |
| PATCH | /classes/:id/subjects/:sid | ADMIN | Update subject teacher |
| DELETE | /classes/:id/subjects/:sid | ADMIN | Remove subject |

### Grades (Fiche de Notes)
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /grades/class/:classId/subject/:subjectId | ADMIN, TEACHER | Get fiche (all students + grades) |
| PUT | /grades/class/:classId/subject/:subjectId | ADMIN, TEACHER | Save fiche (all students) |
| GET | /grades/class/:classId/fiches | ADMIN, TEACHER | List fiche signature statuses |
| POST | /grades/class/:classId/subject/:subjectId/sign | ADMIN, TEACHER | Sign fiche |
| DELETE | /grades/class/:classId/subject/:subjectId/sign | ADMIN, TEACHER | Unsign fiche |

### Reports
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /reports | All | List reports (scoped by role) |
| POST | /reports | ADMIN, TEACHER | Create batch of DRAFT reports for a class |
| GET | /reports/:id | All | Get full report with grades |
| PATCH | /reports/:id | ADMIN, TEACHER | Update report metadata |
| PATCH | /reports/:id/submit | ADMIN, TEACHER | Submit for review (DRAFT → REVIEW) |
| PATCH | /reports/:id/publish | ADMIN | Publish (REVIEW → PUBLISHED) |

### Fees
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /fees | ADMIN, BURSAR | List fees |
| POST | /fees | ADMIN | Create fee |
| PATCH | /fees/:id | ADMIN | Update fee |
| DELETE | /fees/:id | ADMIN | Deactivate fee |
| POST | /fees/:id/assign-to-class | ADMIN, BURSAR | Assign to all students in class |
| GET | /fees/student/:id/summary | ADMIN, BURSAR, PARENT | Student fee summary |

### Payments
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /payments | ADMIN, BURSAR | List payments |
| POST | /payments | ADMIN, BURSAR | Record payment (auto-releases held notifications) |
| GET | /payments/:id | ADMIN, BURSAR | Get payment |
| GET | /payments/student/:id/status | ADMIN, BURSAR | Get student payment status |

### Notifications
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /notifications/mine | All | Get my notifications |
| GET | /notifications/held | ADMIN, BURSAR | List all held notifications |
| PATCH | /notifications/:id/force-send | ADMIN | Force release notification |

### Analytics
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /analytics/overview | ADMIN | Counts: students, teachers, classes, reports, academic year |
| GET | /analytics/payment-summary | ADMIN | Payment totals and rates |
| GET | /analytics/report-stats | ADMIN | Report counts by status |

### Timetables
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /timetables/class/:classId | ADMIN, TEACHER | Get class timetable |
| PUT | /timetables/class/:classId | ADMIN | Replace class timetable |

### Programs
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /programs/class/:classId | ADMIN, TEACHER | List subject programs for class |
| GET | /programs/class/:classId/subject/:subjectId | ADMIN, TEACHER | Get program with chapters |
| PUT | /programs/class/:classId/subject/:subjectId | ADMIN, TEACHER | Create/update program |

### Institutions
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | /institutions/me | All | Get current institution |
| PATCH | /institutions/me | ADMIN | Update institution details |
| PATCH | /institutions/me/branding | ADMIN | Update branding |
| PATCH | /institutions/me/academic-settings | ADMIN | Update term system and settings |

### Upload
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /upload/file?type=logo | ADMIN | Upload file (logo/crest/stamp/etc.) |
| DELETE | /upload/file | ADMIN | Delete file by URL |

---

## 17. Frontend Pages by Role

### Admin (`/admin/*`)
| Path | Page | Description |
|------|------|-------------|
| /admin | AdminDashboardPage | Stats overview: students, teachers, classes, report counts, payment collection rate |
| /admin/users | UsersPage | Create, edit, activate/deactivate users |
| /admin/classes | ClassesPage | Create, edit, deactivate classes; filter by level |
| /admin/classes/:id | ClassDetailPage | Manage students and subjects for a class |
| /admin/students | StudentsPage | Create, edit, search students |
| /admin/subjects | SubjectsPage | Create, edit, deactivate subjects |
| /admin/fees | FeesPage | Create fee structures, assign to classes |
| /admin/payments | PaymentsPage | Record and view payments |
| /admin/notifications | NotificationLogsPage | View and force-release held notifications |
| /admin/analytics | AnalyticsPage | Payment and report analytics |
| /admin/branding | BrandingPage | Upload logos, crests, stamps |
| /admin/settings | SettingsPage | School name, address, term system |
| /admin/reports | ReportCardsPage | View all reports; filter by class, status |
| /admin/bulletins | BulletinsPage | Create and manage announcements |

### Teacher (`/teacher/*`)
| Path | Page | Description |
|------|------|-------------|
| /teacher | TeacherDashboardPage | Quick stats |
| /teacher/classes | MyClassesPage | Classes assigned to this teacher |
| /teacher/classes/:id | ClassDetailPage | Class detail: students, subjects, fiche status, timetable |
| /teacher/classes/:cid/grades/:sid | GradeEntryPage | Grade entry for one subject; sign fiche |
| /teacher/classes/:cid/subjects/:sid/program | ProgramPage | Define curriculum chapters |
| /teacher/reports | ReportCardsPage | View and manage report cards |
| /teacher/reports/new | CreateReportCardPage | Create batch of DRAFT report cards |
| /teacher/reports/:id | EditReportCardPage | Edit report: grades, comments, conduct, publish PDF link |
| /teacher/students/:id | StudentProfilePage | Student profile and grade history |
| /teacher/bulletins | BulletinsPage | Create and manage announcements |

### Parent (`/parent/*`)
| Path | Page | Description |
|------|------|-------------|
| /parent | ParentDashboardPage | Overview of children's progress |
| /parent/children | ChildrenPage | List linked children |
| /parent/children/:id/reports | ChildReportCardsPage | Published report cards; fee paywall if unpaid |
| /parent/bulletins | ChildBulletinsPage | School announcements |
| /parent/payments | PaymentHistoryPage | Payment history and balance |
| /parent/notifications | NotificationPreferencesPage | WhatsApp/email preferences |

### Student (`/student/*`)
| Path | Page | Description |
|------|------|-------------|
| /student | StudentDashboardPage | Overview |
| /student/reports | MyReportCardsPage | Published report cards with print link |
| /student/progress | ProgressPage | Grade trends across terms |
| /student/bulletins | BulletinsPage | Announcements |

### Bursar (`/bursar/*`)
| Path | Page | Description |
|------|------|-------------|
| /bursar | BursarDashboardPage | Payment collection summary |
| /bursar/fees | FeesPage | Manage fee structures |
| /bursar/payments | PaymentsPage | Record payments |
| /bursar/notifications | NotificationLogsPage | View held notifications |

### Shared (all authenticated roles)
| Path | Page | Description |
|------|------|-------------|
| /profile | ProfilePage | Edit name, avatar, notification preferences |
| /reports/:id/print | PrintReportCardPage | A4 print view of a published report card |

---

## 18. Key Business Rules

1. **Fiche must be signed before publish**
   Admin cannot publish a report card unless every subject in the class has a signed `GradeFiche` for that term.

2. **Teacher can only access their own classes**
   `GET /classes` filters to only return classes where the teacher is the main class teacher or teaches at least one subject. Grade entry (`GET/PUT /grades/class/...`) enforces this per-request via `assertClassAccess()`.

3. **Notifications are held until fees paid**
   After publish, if a student's fees are not fully paid, their parent/student notification is set to `HELD_UNPAID` or `HELD_PARTIAL`. It releases automatically when a payment is recorded that brings the balance to zero.

4. **Report cards are immutable once published**
   Once status = `PUBLISHED`, no edits are allowed. Grades, averages, ranks, and mention are frozen.

5. **Class ranks are recomputed on every publish**
   When one student's report is published, the ranks of all previously published students in the same class/year/term are also updated.

6. **One report card per student per term**
   Enforced by unique constraint: `(studentId, academicYear, termNumber)` on `ReportCard`.

7. **Multi-tenant isolation**
   Every query is scoped by `institutionId`. A user can only see data belonging to their institution.

8. **Grade formula is Togolese curriculum**
   Subject average = weighted mean of (interrogations average × 1) + (devoir × 2) + (composition × 3). Only filled components contribute to the weight.

9. **Coefficient per subject**
   Each subject in a class has a coefficient (e.g., Maths = 7, French = 3 for Terminale D). The overall average is the weighted average of subject averages × coefficients, not a simple mean.

10. **PDF generation is async**
    The publish endpoint returns immediately. The PDF is generated in the background and `pdfUrl` is updated when ready. Users can always print via the browser print page while waiting.

---

*Generated on 2026-05-03 | NovaBulletin v1.0 | Stack: NestJS + Prisma + React*
