# User Manuals

Role-specific guides for every NovaBulletin user type.

| Role | File | Responsibilities |
|---|---|---|
| Administrator | [admin.md](admin.md) | Institution setup, users, classes, students, subjects, fees, analytics, branding, publishing |
| Teacher | [teacher.md](teacher.md) | Report card creation, grade entry, submission for review |
| Bursar | [bursar.md](bursar.md) | Fee structures, payment recording, held bulletin monitoring |
| Parent | [parent.md](parent.md) | Viewing report cards, receiving bulletin notifications |
| Student | [student.md](student.md) | Viewing own report cards and announcements |

## Role Hierarchy

```
ADMIN
 ├── can do everything below
 ├── manages TEACHER, BURSAR, PARENT, STUDENT accounts
 └── publishes report cards and overrides fee-gate

TEACHER
 └── enters grades and submits reports for classes they own

BURSAR
 └── records payments and monitors held bulletin queue

PARENT
 └── views children's report cards, receives bulletin notifications

STUDENT
 └── views own report cards
```

## The Fee-Gate Flow

```
Teacher publishes report card
        ↓
System checks parent's payment status
        ↓
   PAID / EXEMPT          PARTIAL / UNPAID
        ↓                       ↓
PDF sent immediately       PDF held — in-app
via WhatsApp + Email       notice shown to parent
                                ↓
                     Bursar records full payment
                                ↓
                     Bulletin auto-released → sent
```
