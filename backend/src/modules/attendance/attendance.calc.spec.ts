import { AttendanceService, resolveTermRange } from './attendance.service';

describe('resolveTermRange', () => {
  it('uses the Togolese default calendar', () => {
    const t2 = resolveTermRange({}, '2025-2026', 'TRIMESTRE', 2)!;
    expect(t2.start.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(t2.end.toISOString().slice(0, 10)).toBe('2026-03-31');
    const s1 = resolveTermRange({}, '2027-2028', 'SEMESTRE', 1)!;
    expect(s1.end.toISOString().slice(0, 10)).toBe('2028-02-29');
  });

  it('prefers admin dates within the school year, ignores stale ones', () => {
    const settings = { termType: 'TRIMESTRE', termDates: [{ termNumber: 1, start: '2025-09-15', end: '2025-12-19' }] };
    expect(resolveTermRange(settings, '2025-2026', 'TRIMESTRE', 1)!.start.toISOString().slice(0, 10)).toBe('2025-09-15');
    // Old year's dates don't apply to a new year
    expect(resolveTermRange(settings, '2026-2027', 'TRIMESTRE', 1)!.start.toISOString().slice(0, 10)).toBe('2026-09-01');
  });
});

describe('computeTermAttendance', () => {
  const rec = (studentId: string, date: string, status: string, minutesLate: number | null = null) =>
    ({ studentId, date: new Date(`${date}T00:00:00Z`), status, minutesLate });

  it('counts distinct absent days and sums late minutes', async () => {
    const prisma: any = {
      institution: { findUnique: jest.fn().mockResolvedValue({ academicSettings: {} }) },
      attendance: {
        findMany: jest.fn().mockResolvedValue([
          rec('a', '2025-10-06', 'ABSENT'),          // 2 sessions same day → 1 day
          rec('a', '2025-10-06', 'ABSENT'),
          rec('a', '2025-10-07', 'EXCUSED'),         // justified day
          rec('a', '2025-10-08', 'EXCUSED'),         // mixed day → unjustified
          rec('a', '2025-10-08', 'ABSENT'),
          rec('a', '2025-10-09', 'LATE', 30),
          rec('a', '2025-10-10', 'LATE', 60),
          rec('b', '2025-10-06', 'PRESENT'),
        ]),
      },
    };
    const service = new AttendanceService(prisma);
    const map = await service.computeTermAttendance('c1', '2025-2026', 'TRIMESTRE', 1, 'inst');
    expect(map.get('a')).toEqual({ studentId: 'a', absentDays: 2, excusedDays: 1, lateCount: 2, lateMinutes: 90 });
    expect(map.get('b')).toEqual({ studentId: 'b', absentDays: 0, excusedDays: 0, lateCount: 0, lateMinutes: 0 });
  });
});
