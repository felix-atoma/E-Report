import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { Role } from '../../common/enums/role.enum';

export interface TermAttendance {
  studentId: string;
  absentDays: number;   // jours avec au moins une absence non justifiée
  excusedDays: number;  // jours d'absence entièrement justifiés
  lateCount: number;
  lateMinutes: number;
}

function sessionKeyOf(subjectId?: string | null, startTime?: string | null) {
  if (!subjectId && !startTime) return '';
  return `${subjectId ?? ''}|${startTime ?? ''}`;
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Période (bornes incluses, dates UTC) couverte par un trimestre/semestre.
 * Utilise les dates configurées par l'admin (academicSettings.termDates) si elles
 * tombent dans l'année scolaire, sinon le calendrier togolais par défaut.
 */
export function resolveTermRange(
  academicSettings: any,
  academicYear: string,
  termType: string,
  termNumber: number,
): { start: Date; end: Date } | null {
  const startYear = parseInt((academicYear ?? '').split('-')[0], 10);
  if (isNaN(startYear)) return null;
  const yearStart = new Date(Date.UTC(startYear, 8, 1));
  const yearEnd = new Date(Date.UTC(startYear + 1, 7, 31));

  const settings = academicSettings ?? {};
  const configured: Array<{ termNumber: number; start: string; end: string }> =
    Array.isArray(settings.termDates) ? settings.termDates : [];
  const sameSystem = (settings.termType ?? 'TRIMESTRE') === termType;
  const entry = sameSystem ? configured.find((t) => Number(t.termNumber) === termNumber) : undefined;
  if (entry?.start && entry?.end) {
    const start = new Date(`${entry.start}T00:00:00Z`);
    const end = new Date(`${entry.end}T00:00:00Z`);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= yearStart && start <= yearEnd && end >= start) {
      return { start, end };
    }
  }

  const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
  if (termType === 'TRIMESTRE') {
    if (termNumber === 1) return { start: d(startYear, 9, 1), end: d(startYear, 12, 31) };
    if (termNumber === 2) return { start: d(startYear + 1, 1, 1), end: d(startYear + 1, 3, 31) };
    if (termNumber === 3) return { start: d(startYear + 1, 4, 1), end: yearEnd };
  }
  if (termType === 'SEMESTRE') {
    if (termNumber === 1) return { start: yearStart, end: d(startYear + 1, 2, lastDayOfMonth(startYear + 1, 2)) };
    if (termNumber === 2) return { start: d(startYear + 1, 3, 1), end: yearEnd };
  }
  // CUSTOM sans dates configurées : toute l'année scolaire
  return { start: yearStart, end: yearEnd };
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Un professeur ne peut saisir que pour les classes/matières qui lui sont attribuées. */
  private async assertCanRecord(classId: string, subjectId: string | undefined, institutionId: string, role: Role, userId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (role !== Role.TEACHER || cls.teacherId === userId) return;

    const teaches = await this.prisma.classSubject.findFirst({
      where: { classId, teacherId: userId, ...(subjectId ? { subjectId } : {}) },
    });
    if (!teaches) {
      throw new ForbiddenException("Vous n'enseignez pas cette matière dans cette classe");
    }
  }

  async bulkUpsert(dto: BulkAttendanceDto, institutionId: string, recordedByName: string, role: Role, userId: string) {
    await this.assertCanRecord(dto.classId, dto.subjectId, institutionId, role, userId);

    const date = new Date(dto.date);
    const subjectId = dto.subjectId || null;
    const startTime = dto.startTime || null;
    const sessionKey = sessionKeyOf(subjectId, startTime);

    const enrolled = await this.prisma.classStudent.findMany({
      where: { classId: dto.classId },
      select: { studentId: true },
    });
    const enrolledIds = new Set(enrolled.map((e) => e.studentId));
    const entries = dto.entries.filter((e) => enrolledIds.has(e.studentId));

    const ops = entries.map(entry => {
      const minutesLate = entry.status === 'LATE' ? (entry.minutesLate ?? null) : null;
      return this.prisma.attendance.upsert({
        where: {
          studentId_classId_date_sessionKey: {
            studentId: entry.studentId, classId: dto.classId, date, sessionKey,
          },
        },
        create: {
          studentId: entry.studentId,
          classId: dto.classId,
          institutionId,
          subjectId,
          startTime,
          sessionKey,
          date,
          status: entry.status,
          minutesLate,
          note: entry.note ?? null,
          recordedBy: recordedByName,
        },
        update: {
          status: entry.status,
          minutesLate,
          note: entry.note ?? null,
          recordedBy: recordedByName,
        },
      });
    });

    return this.prisma.$transaction(ops);
  }

  /**
   * Cumul des absences (en jours) et retards (en minutes) par élève sur un trimestre.
   * Seuls les élèves ayant au moins une saisie apparaissent dans le résultat.
   */
  async computeTermAttendance(
    classId: string,
    academicYear: string,
    termType: string,
    termNumber: number,
    institutionId: string,
    studentIds?: string[],
  ): Promise<Map<string, TermAttendance>> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { academicSettings: true },
    });
    const range = resolveTermRange(institution?.academicSettings, academicYear, termType, termNumber);
    const result = new Map<string, TermAttendance>();
    if (!range) return result;

    const records = await this.prisma.attendance.findMany({
      where: {
        classId,
        class: { institutionId },
        date: { gte: range.start, lte: range.end },
        ...(studentIds ? { studentId: { in: studentIds } } : {}),
      },
      select: { studentId: true, date: true, status: true, minutesLate: true },
    });

    // studentId → date → statuts de la journée
    const days = new Map<string, Map<string, Set<string>>>();
    for (const r of records) {
      let stats = result.get(r.studentId);
      if (!stats) {
        stats = { studentId: r.studentId, absentDays: 0, excusedDays: 0, lateCount: 0, lateMinutes: 0 };
        result.set(r.studentId, stats);
      }
      if (r.status === 'LATE') {
        stats.lateCount++;
        stats.lateMinutes += r.minutesLate ?? 0;
      }
      const dayKey = r.date.toISOString().slice(0, 10);
      if (!days.has(r.studentId)) days.set(r.studentId, new Map());
      const byDay = days.get(r.studentId)!;
      if (!byDay.has(dayKey)) byDay.set(dayKey, new Set());
      byDay.get(dayKey)!.add(r.status);
    }

    for (const [studentId, byDay] of days) {
      const stats = result.get(studentId)!;
      for (const statuses of byDay.values()) {
        // Une seule absence non justifiée dans la journée → journée non justifiée
        if (statuses.has('ABSENT')) stats.absentDays++;
        else if (statuses.has('EXCUSED')) stats.excusedDays++;
      }
    }

    return result;
  }

  async termSummary(classId: string, academicYear: string, termType: string, termNumber: number, institutionId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');
    const map = await this.computeTermAttendance(classId, academicYear, termType, termNumber, institutionId);
    return Array.from(map.values());
  }

  async listByClass(
    classId: string,
    institutionId: string,
    date?: string,
    subjectId?: string,
    startTime?: string,
  ) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    const sessionFilter = date && (subjectId !== undefined || startTime !== undefined)
      ? { sessionKey: sessionKeyOf(subjectId || null, startTime || null) }
      : subjectId ? { subjectId } : {};

    return this.prisma.attendance.findMany({
      where: {
        classId,
        ...(date ? { date: new Date(date) } : {}),
        ...sessionFilter,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        subject: { select: { id: true, nameFr: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async listByStudent(studentId: string, institutionId: string, role: Role, userId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, institutionId } });
    if (!student) throw new NotFoundException('Student not found');

    if (role === Role.PARENT && student.parentId !== userId) {
      throw new NotFoundException('Student not found');
    }
    if (role === Role.STUDENT && student.userId !== userId) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.attendance.findMany({
      where: { studentId },
      include: {
        subject: { select: { id: true, nameFr: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async summary(classId: string, institutionId: string, academicYear: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    // Parse "2024-2025" → Sept 1 start, Aug 31 end
    const dateFilter: any = {};
    if (academicYear) {
      const [startYearStr] = academicYear.split('-');
      const startYear = parseInt(startYearStr, 10);
      if (!isNaN(startYear)) {
        dateFilter.gte = new Date(`${startYear}-09-01`);
        dateFilter.lte = new Date(`${startYear + 1}-08-31`);
      }
    }

    const records = await this.prisma.attendance.findMany({
      where: {
        classId,
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      include: { student: { include: { user: { select: { name: true } } } } },
    });

    const byStudent: Record<string, { name: string; present: number; absent: number; late: number; excused: number }> = {};
    for (const r of records) {
      const key = r.studentId;
      if (!byStudent[key]) {
        byStudent[key] = {
          name: r.student.user?.name ?? r.student.admissionNumber,
          present: 0, absent: 0, late: 0, excused: 0,
        };
      }
      if (r.status === 'PRESENT') byStudent[key].present++;
      else if (r.status === 'ABSENT') byStudent[key].absent++;
      else if (r.status === 'LATE') byStudent[key].late++;
      else if (r.status === 'EXCUSED') byStudent[key].excused++;
    }

    return Object.entries(byStudent).map(([studentId, stats]) => ({ studentId, ...stats }));
  }

  async remove(id: string, institutionId: string) {
    const record = await this.prisma.attendance.findFirst({
      where: { id },
      include: { class: true },
    });
    if (!record || record.class.institutionId !== institutionId) {
      throw new NotFoundException('Attendance record not found');
    }
    return this.prisma.attendance.delete({ where: { id } });
  }

  async justifyAbsence(id: string, reason: string, parentUserId: string, institutionId: string) {
    const record = await this.prisma.attendance.findFirst({
      where: { id },
      include: { class: true, student: { select: { parentId: true } } },
    });
    if (!record || record.class.institutionId !== institutionId) {
      throw new NotFoundException('Absence record not found');
    }
    if (record.student.parentId !== parentUserId) {
      throw new ForbiddenException('Not authorized to justify this absence');
    }
    const note = `JUSTIFY_PENDING: ${(reason ?? '').trim()}`;
    return this.prisma.attendance.update({ where: { id }, data: { note } });
  }

  async approveJustification(id: string, institutionId: string) {
    const record = await this.prisma.attendance.findFirst({
      where: { id },
      include: { class: true },
    });
    if (!record || record.class.institutionId !== institutionId) {
      throw new NotFoundException('Attendance record not found');
    }
    const approvedNote = record.note?.replace('JUSTIFY_PENDING:', 'JUSTIFIED:') ?? 'JUSTIFIED';
    return this.prisma.attendance.update({
      where: { id },
      data: { status: 'EXCUSED', note: approvedNote },
    });
  }

  async pendingJustifications(institutionId: string) {
    return this.prisma.attendance.findMany({
      where: {
        status: 'ABSENT',
        note: { startsWith: 'JUSTIFY_PENDING:' },
        class: { institutionId },
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
