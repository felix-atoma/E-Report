# Student Manual

As a Student you can view your own report cards and read school announcements. No other data is accessible to your account.

---

## 1. Your Report Cards

`GET /api/reports`

Lists all your published report cards across all terms and academic years.

`GET /api/reports/:id`

Full report card detail:

| Field | Description |
|---|---|
| `termName` | e.g. `1er Trimestre` |
| `academicYear` | e.g. `2024-2025` |
| `overallAverage` | Your moyenne générale (0–20) |
| `mention` | Appreciation based on your average |
| `classRank` | Your position in class |
| `classSize` | Total students ranked |
| `teacherComment` | Your class teacher's comment |
| `attendanceDays` | School days in the term |
| `attendancePresent` | Days you attended |
| `grades` | Subject-by-subject breakdown |
| `pdfUrl` | Link to your PDF bulletin |

---

## 2. Grades Breakdown

| Field | Description |
|---|---|
| `subject.nameFr` | Subject name |
| `score` | Your score out of 20 |
| `coefficient` | Subject weight |
| `teacherComment` | Teacher's remark (if provided) |

Your `overallAverage` is:

```
Moyenne = Σ (score × coefficient) / Σ coefficients
```

Pass mark is **10/20**.

---

## 3. Mention Scale

| Mention | Average |
|---|---|
| Excellent | 18 – 20 |
| Très Bien | 16 – 17,99 |
| Bien | 14 – 15,99 |
| Assez Bien | 12 – 13,99 |
| Passable | 10 – 11,99 |
| Insuffisant | 0 – 9,99 |

---

## 4. Notifications

`GET /api/notifications/mine`

Notifications you have received — announcements and report card alerts linked to your account.

---

## 5. Announcements

`GET /api/bulletins`

School-wide announcements: exam schedules, holiday notices, events.

---

## 6. Your Profile

`GET /api/auth/me` — view your account details

`PATCH /api/users/:id` — update your email or language preference (`FR` / `EN`)
