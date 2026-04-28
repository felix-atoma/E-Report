# Administrator Manual

The Administrator has full access to the platform. Every action described in the other role manuals is also available to you.

---

## 1. Institution Setup

### Profile & contact details
`PATCH /api/institutions/me`

Update your school's name, address, phone, email, website, motto, and mission statement. These fields appear on printed report cards.

### Academic settings
`PATCH /api/institutions/me/academic-settings`

| Setting | Options | Default |
|---|---|---|
| Term system | `TRIMESTRE` (3 terms) · `SEMESTRE` (2 terms) · `CUSTOM` | `TRIMESTRE` |
| Pass mark | any value 0–20 | `10` |
| Fee-gate enabled | `true` / `false` | `true` |

Set **fee-gate** to `false` to deliver all report cards immediately regardless of payment status.

### Branding assets
`PATCH /api/institutions/me/branding`

Upload and attach the assets that appear on PDF bulletins:

| Asset type | Used for |
|---|---|
| `logo` | Top-left header on every report card |
| `crest` | Decorative seal beside the school name |
| `stamp` | Official stamp image on published bulletins |
| `signature` | Principal's signature |
| `watermark` | Background watermark on PDF pages |
| `header` | Full-width header image |

Files must be JPEG, PNG, WebP, or SVG and under 5 MB. Upload via `POST /api/upload/file?type=<type>`, then save the returned URL with `PATCH /api/institutions/me/branding`.

---

## 2. User Management

### Create a user
`POST /api/users`

| Field | Required | Notes |
|---|---|---|
| `email` | Yes | Must be unique |
| `name` | Yes | |
| `role` | Yes | `ADMIN` · `TEACHER` · `BURSAR` · `PARENT` · `STUDENT` |
| `whatsappNumber` | No | Required for WhatsApp bulletin delivery (parents) |

New users receive a password-reset email to set their own password.

### Manage users
- `GET /api/users` — list all users
- `GET /api/users/teachers` — list teachers only (useful when assigning a class)
- `GET /api/users/:id` — view a user's profile
- `PATCH /api/users/:id` — update name, email, WhatsApp number, language, notification preferences
- `PATCH /api/users/:id/deactivate` — revoke access without deleting the account
- `PATCH /api/users/:id/activate` — restore access

---

## 3. Classes

### Create a class
`POST /api/classes`

| Field | Notes |
|---|---|
| `name` | e.g. `6ème A`, `Terminale D1` |
| `level` | e.g. `6eme`, `Terminale` |
| `academicYear` | e.g. `2024-2025` |
| `teacherId` | The assigned class teacher |
| `capacity` | Maximum students |

### Enroll students
`POST /api/classes/:id/enroll` — body: `{ "studentId": "..." }`

`DELETE /api/classes/:id/students/:studentId` — unenroll a student

### Assign subjects
`POST /api/classes/:id/subjects` — body: `{ "subjectId": "..." }`

`DELETE /api/classes/:id/subjects/:subjectId` — remove a subject

### Deactivate a class
`PATCH /api/classes/:id/deactivate` — marks the class inactive; existing report cards are preserved.

---

## 4. Students

### Create a student
`POST /api/students`

| Field | Notes |
|---|---|
| `admissionNumber` | Must be unique within the institution |
| `dateOfBirth` | ISO date |
| `parentId` | Link to an existing parent user |
| `userId` | Optional student portal account |

### View & update
- `GET /api/students` — full list with class and payment information
- `GET /api/students/:id` — detail with class history and report cards
- `PATCH /api/students/:id` — update any field

---

## 5. Subjects

- `POST /api/subjects` — create (name in French + English, code, category)
- `GET /api/subjects` — list active subjects
- `PATCH /api/subjects/:id` — update
- `DELETE /api/subjects/:id` — deactivate (does not delete historical grades)

---

## 6. Fee Management

### Create a fee structure
`POST /api/fees`

| Field | Notes |
|---|---|
| `name` | e.g. `Scolarité 2024-2025` |
| `amount` | In FCFA (integer) |
| `feeType` | `TUITION` · `REGISTRATION` · `TRANSPORT` · `CANTEEN` · `OTHER` |
| `academicYear` | e.g. `2024-2025` |
| `term` | Optional — leave blank for annual fees |

### Assign a fee to a class
`POST /api/fees/:id/assign-to-class`

Body: `{ "classId": "...", "academicYear": "2024-2025" }`

This creates a `StudentFee` record for every student currently enrolled in that class. Students enrolled later must be assigned individually.

### Exemptions
To exempt a student from a fee, set `isExempt: true` on their `StudentFee` record. Their payment status becomes `EXEMPT` and their bulletin is delivered immediately regardless of the fee-gate setting.

### View student fee summary
`GET /api/fees/student/:studentId/summary?academicYear=2024-2025`

Returns `totalDue`, `totalPaid`, `balance`, `paymentStatus` (`PAID` · `PARTIAL` · `UNPAID` · `EXEMPT`), and a breakdown by fee line.

---

## 7. Report Cards

Administrators can publish report cards and force-release held bulletins.

### Publish a report card
`PATCH /api/reports/:id/publish`

Triggers the fee-gate delivery flow:
- **PAID / EXEMPT** → PDF generated, WhatsApp + Email sent immediately
- **PARTIAL / UNPAID** → PDF generated, delivery held; parent sees an in-app notice

### Force-release a held notification
`PATCH /api/notifications/:id/force-send`

Overrides the fee gate and sends the bulletin immediately regardless of payment status. Use this at the admin's discretion (e.g. after a payment agreement).

---

## 8. Notifications

- `GET /api/notifications/held` — list all bulletins currently held due to unpaid fees (Admin/Bursar view)
- `GET /api/notifications/mine` — your own notifications

---

## 9. Analytics

All analytics endpoints require Admin role.

| Endpoint | Returns |
|---|---|
| `GET /api/analytics/overview` | Total students, teachers, classes, published reports, pending payments |
| `GET /api/analytics/payment-summary?academicYear=2024-2025` | Total due vs paid, collection rate, breakdown by status |
| `GET /api/analytics/report-stats?academicYear=2024-2025` | Report cards by status (DRAFT / REVIEW / PUBLISHED), per class |

---

## 10. Bulletins & Announcements

- `POST /api/bulletins` — create a draft announcement (title, body, targetRoles, attachments)
- `PATCH /api/bulletins/:id/publish` — publish to targeted roles
- `GET /api/bulletins` — list all bulletins for the institution
