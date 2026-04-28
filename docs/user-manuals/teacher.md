# Teacher Manual

As a Teacher you can manage report cards for the classes assigned to you. You cannot access other classes, fee data, or administrative settings.

---

## 1. Your Classes

`GET /api/classes`

Returns only the classes where you are the assigned class teacher. Each class includes its enrolled students and assigned subjects.

`GET /api/classes/:id`

Full detail: student list, subject list, and the coefficient assigned to each subject for grade entry.

---

## 2. Report Cards

### Workflow overview

```
DRAFT  →  (enter grades)  →  REVIEW  →  PUBLISHED
```

Only an **Admin** can publish. Your job is to create, fill in, and submit.

---

### Create a report card
`POST /api/reports`

| Field | Required | Notes |
|---|---|---|
| `studentId` | Yes | Must be in one of your classes |
| `classId` | Yes | |
| `academicYear` | Yes | e.g. `2024-2025` |
| `termType` | Yes | `TRIMESTRE` · `SEMESTRE` · `CUSTOM` |
| `termNumber` | Yes | `1`, `2`, or `3` |
| `termName` | Yes | e.g. `1er Trimestre` |

The report card is created in **DRAFT** status.

---

### Enter grades
`PUT /api/grades/report/:reportId/bulk`

Send all grades for a report card in a single call.

```json
{
  "grades": [
    { "subjectId": "math-001", "score": 14.5, "coefficient": 4, "teacherComment": "Bon travail" },
    { "subjectId": "fr-001",   "score": 12,   "coefficient": 3 }
  ]
}
```

- `score` — 0 to 20 (French grading scale)
- `coefficient` — entered per grade; not stored on the subject
- `teacherComment` — optional, per-subject remark

You can call this endpoint multiple times. It upserts — existing grades are updated, new ones are added.

### View grades
`GET /api/grades/report/:reportId`

Returns all grades for the report card along with the calculated `overallAverage` (`Σ score × coef / Σ coef`).

---

### Add report-level comments
`PATCH /api/reports/:id`

| Field | Notes |
|---|---|
| `teacherComment` | Your overall comment on the student's term |
| `principalComment` | Left blank until the principal reviews |
| `conductRating` | e.g. `Très bien`, `Satisfaisant` |
| `attendanceDays` | Total school days in the term |
| `attendancePresent` | Days the student was present |

---

### Submit for review
`PATCH /api/reports/:id/submit`

Moves the report from **DRAFT** to **REVIEW**. After submission the Admin reviews and publishes. You can no longer edit grades once the report is in REVIEW.

---

## 3. Viewing Report Cards

`GET /api/reports` — lists all report cards for your classes (any status)

`GET /api/reports/:id` — full detail including grades, averages, and delivery status

---

## 4. Your Notifications

`GET /api/notifications/mine`

Shows the 50 most recent notifications sent to your account (announcements, system alerts).

---

## 5. Bulletins & Announcements

`GET /api/bulletins` — read bulletins published to teachers

If you are also granted authorship rights by the Admin, you may also create and publish bulletins targeting specific roles.

---

## Grading Reference

| Mention | Range |
|---|---|
| Excellent | 18 – 20 |
| Très Bien | 16 – 17,99 |
| Bien | 14 – 15,99 |
| Assez Bien | 12 – 13,99 |
| Passable | 10 – 11,99 |
| Insuffisant | 0 – 9,99 |

Pass mark is **10/20** by default (configurable by Admin).
