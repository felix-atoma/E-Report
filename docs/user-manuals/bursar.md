# Bursar Manual

The Bursar manages fee collection and payment recording. You do not have access to grade entry, report card publishing, or institution settings.

---

## 1. Fee Structures

### View all fees
`GET /api/fees`

Lists every fee structure defined by the Admin, including amount, type, and academic year.

### View a student's fee summary
`GET /api/fees/student/:studentId/summary?academicYear=2024-2025`

Returns:

| Field | Description |
|---|---|
| `totalDue` | Sum of all assigned fees (FCFA) |
| `totalPaid` | Sum of all recorded payments |
| `balance` | `totalDue – totalPaid` |
| `paymentStatus` | `PAID` · `PARTIAL` · `UNPAID` · `EXEMPT` |
| `fees` | Line-by-line breakdown of each fee and its amount |
| `payments` | List of all payments made, with dates and receipt numbers |

---

## 2. Recording Payments

### Record a payment
`POST /api/payments`

| Field | Required | Notes |
|---|---|---|
| `studentId` | Yes | |
| `amount` | Yes | In FCFA (integer) |
| `paymentMethod` | Yes | `CASH` · `TMONEY` · `FLOOZ` · `MOMO` · `BANK_TRANSFER` · `CHEQUE` · `OTHER` |
| `academicYear` | Yes | e.g. `2024-2025` |
| `term` | No | Leave blank for annual payments |
| `notes` | No | e.g. cheque number, mobile reference |

The system automatically:
1. Generates a receipt number in the format `REC-YYYY-NNNNN`
2. Recalculates the student's payment status
3. **If the student is now fully PAID**, releases any held bulletin notifications — the bulletin is sent via WhatsApp and Email within minutes

### Confirm the outcome
After recording, check the returned `paymentStatus`. If it is now `PAID`, the bulletin delivery is triggered automatically — no further action is needed.

---

## 3. Payment History

### All payments for the institution
`GET /api/payments`

Supports filtering by `academicYear`, `term`, `studentId`.

### Single payment detail
`GET /api/payments/:id`

Returns full details including receipt number, method, date, and which staff member recorded it.

### Student payment status
`GET /api/payments/student/:studentId/status?academicYear=2024-2025`

Quick check: returns `status` (`PAID` / `PARTIAL` / `UNPAID` / `EXEMPT`) and `balance`.

---

## 4. Held Notifications

`GET /api/notifications/held`

Lists all bulletin notifications currently held because of unpaid or partially paid fees. Use this to identify which parents have not yet received their child's report card.

Each entry shows:
- Student name and class
- Parent name, email, and WhatsApp number
- Report card term and academic year
- Hold reason (`HELD_UNPAID` or `HELD_PARTIAL`)

Once you record a payment that brings the balance to zero, the held entry is automatically released — it disappears from this list.

---

## 5. Payment Methods Reference

| Code | Description |
|---|---|
| `CASH` | Cash payment at the school cashier |
| `TMONEY` | Togocom TMoney mobile money |
| `FLOOZ` | Moov Africa Flooz mobile money |
| `MOMO` | MTN Mobile Money |
| `BANK_TRANSFER` | Direct bank transfer |
| `CHEQUE` | Bank cheque |
| `OTHER` | Any other method — add details in `notes` |

---

## 6. Receipts

Receipt numbers are generated automatically in the format `REC-{YEAR}-{SEQUENCE}`, e.g. `REC-2025-00042`. The sequence is global per institution per year. Receipt numbers appear on the payment record and can be printed or shared with the parent as proof of payment.
