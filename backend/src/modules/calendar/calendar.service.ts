import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { examTermNumber } from '../../common/utils/exam-term.util';

// Évaluations : chaque professeur concerné voit une alerte « saisir les notes » sur son tableau de bord.
// Seule l'administration les programme.
const EVALUATION_TYPES = ['INTERROGATION', 'DEVOIR', 'COMPOSITION', 'EXAM'];

// Colonne de la fiche de notes du trimestre remplie par chaque type d'évaluation
type NoteColumn = 'noteInterro1' | 'noteInterro2' | 'noteInterro3' | 'noteInterro4' | 'noteDevoir' | 'noteComposition';
// Alerte du professeur : de 7 jours avant jusqu'à 30 jours après l'évaluation
const ALERT_DAYS_BEFORE = 7;
const ALERT_DAYS_AFTER = 30;
const DAY_MS = 86400000;

// Classes concernées : liste choisie, sinon la classe unique (anciens événements), sinon toutes
function concernsClass(ev: { classId: string | null; classIds: string[] }, classId: string) {
  if (ev.classIds?.length) return ev.classIds.includes(classId);
  return !ev.classId || ev.classId === classId;
}

function assertCanSchedule(type: string | undefined, role: Role) {
  if (type && EVALUATION_TYPES.includes(type) && role !== Role.ADMIN) {
    throw new ForbiddenException("Seule l'administration programme les évaluations");
  }
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, role: Role) {
    const where: any = { institutionId };
    if (role === Role.PARENT || role === Role.STUDENT) {
      where.isPublic = true;
    }
    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Évaluations programmées qui concernent le professeur, avec pour chacune de ses fiches (classe × matière)
   * l'état réel de la saisie : la colonne correspondante (Interro n, Devoir, Composition) est-elle remplie
   * pour tous les élèves, ou la fiche signée ? La n-ième interrogation du trimestre d'une classe remplit « Interro n ».
   */
  async myEvaluations(institutionId: string, userId: string) {
    const now = Date.now();
    const events = await this.prisma.calendarEvent.findMany({
      where: { institutionId, type: { in: EVALUATION_TYPES as any } },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    });
    const inWindow = events.filter((ev) => {
      const start = ev.startDate.getTime();
      const end = (ev.endDate ?? ev.startDate).getTime();
      return start - now <= (ALERT_DAYS_BEFORE + 1) * DAY_MS && now - end <= (ALERT_DAYS_AFTER + 1) * DAY_MS;
    });
    if (!inWindow.length) return [];

    // Fiches du professeur : ses matières, et celles sans professeur dans les classes dont il est titulaire
    const [assignments, inst] = await Promise.all([
      this.prisma.classSubject.findMany({
        where: {
          class: { institutionId, isActive: true },
          OR: [{ teacherId: userId }, { teacherId: null, class: { teacherId: userId } }],
        },
        select: {
          classId: true, subjectId: true,
          class: { select: { name: true, academicYear: true } },
          subject: { select: { nameFr: true } },
        },
      }),
      this.prisma.institution.findUnique({ where: { id: institutionId }, select: { academicSettings: true } }),
    ]);
    if (!assignments.length) return [];
    const settings = inst?.academicSettings;
    const termOf = (ev: { title: string; startDate: Date }, academicYear: string) =>
      examTermNumber({ label: ev.title, examDate: ev.startDate, academicYear }, settings);

    const columnFor = (ev: (typeof events)[number], classId: string, academicYear: string, term: number): NoteColumn => {
      if (ev.type === 'DEVOIR') return 'noteDevoir';
      if (ev.type !== 'INTERROGATION') return 'noteComposition';
      const sameTerm = events.filter((e) => e.type === 'INTERROGATION' && concernsClass(e, classId)
        && termOf(e, academicYear) === term);
      const rank = Math.min(4, Math.max(1, sameTerm.findIndex((e) => e.id === ev.id) + 1));
      return `noteInterro${rank}` as NoteColumn;
    };

    // Fiches à vérifier, puis lecture groupée des élèves, notes et signatures
    const targets = inWindow.flatMap((ev) => assignments
      .filter((a) => concernsClass(ev, a.classId))
      .map((a) => {
        const academicYear = a.class.academicYear;
        const termNumber = termOf(ev, academicYear);
        return { ev, a, academicYear, termNumber, column: columnFor(ev, a.classId, academicYear, termNumber) };
      }));
    if (!targets.length) return [];

    const classIds = [...new Set(targets.map((t) => t.a.classId))];
    const subjectIds = [...new Set(targets.map((t) => t.a.subjectId))];
    const [enrollments, fiches] = await Promise.all([
      this.prisma.classStudent.findMany({ where: { classId: { in: classIds } }, select: { classId: true, studentId: true, academicYear: true } }),
      this.prisma.gradeFiche.findMany({
        where: { classId: { in: classIds }, subjectId: { in: subjectIds }, signedAt: { not: null } },
        select: { classId: true, subjectId: true, academicYear: true, termNumber: true },
      }),
    ]);
    const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
    const grades = studentIds.length ? await this.prisma.grade.findMany({
      where: { subjectId: { in: subjectIds }, reportCard: { studentId: { in: studentIds } } },
      select: {
        subjectId: true, noteInterro1: true, noteInterro2: true, noteInterro3: true, noteInterro4: true,
        noteDevoir: true, noteComposition: true,
        reportCard: { select: { studentId: true, academicYear: true, termNumber: true } },
      },
    }) : [];
    const gradeKey = (studentId: string, subjectId: string, year: string, term: number) => `${studentId}|${subjectId}|${year}|${term}`;
    const gradeMap = new Map(grades.map((g) => [gradeKey(g.reportCard.studentId, g.subjectId, g.reportCard.academicYear, g.reportCard.termNumber), g]));
    const ficheKey = (classId: string, subjectId: string, year: string, term: number) => `${classId}|${subjectId}|${year}|${term}`;
    const signed = new Set(fiches.map((f) => ficheKey(f.classId, f.subjectId, f.academicYear, f.termNumber)));

    const byEvent = new Map<string, any>();
    for (const t of targets) {
      const students = enrollments.filter((e) => e.classId === t.a.classId && e.academicYear === t.academicYear);
      if (!students.length) continue; // classe sans élève : rien à saisir
      const filled = students.filter((s) => gradeMap.get(gradeKey(s.studentId, t.a.subjectId, t.academicYear, t.termNumber))?.[t.column] != null).length;
      const isSigned = signed.has(ficheKey(t.a.classId, t.a.subjectId, t.academicYear, t.termNumber));
      if (!byEvent.has(t.ev.id)) byEvent.set(t.ev.id, { ...t.ev, fiches: [] });
      byEvent.get(t.ev.id).fiches.push({
        classId: t.a.classId, className: t.a.class.name,
        subjectId: t.a.subjectId, subjectName: t.a.subject.nameFr,
        academicYear: t.academicYear, termNumber: t.termNumber, column: t.column,
        filled, total: students.length, signed: isSigned,
        complete: isSigned || filled === students.length,
      });
    }
    return [...byEvent.values()].map((ev) => ({ ...ev, complete: ev.fiches.every((f: any) => f.complete) }));
  }

  async create(dto: CreateCalendarEventDto, institutionId: string, userId: string, role: Role) {
    assertCanSchedule(dto.type, role);
    return this.prisma.calendarEvent.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        institutionId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateCalendarEventDto>, institutionId: string, role: Role) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, institutionId } });
    if (!event) throw new NotFoundException('Calendar event not found');
    assertCanSchedule(event.type, role);
    assertCanSchedule(dto.type, role);
    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, institutionId } });
    if (!event) throw new NotFoundException('Calendar event not found');
    return this.prisma.calendarEvent.delete({ where: { id } });
  }
}
