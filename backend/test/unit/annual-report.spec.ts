import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PdfService } from '../../src/modules/pdf/pdf.service';
import { AttendanceService } from '../../src/modules/attendance/attendance.service';
import { AiService } from '../../src/modules/ai/ai.service';
import { Role } from '../../src/common/enums/role.enum';
import {
  annualAverage, annualSettings, expectedTermCount, proposedDecision, rankWithTies, ADMIS, REDOUBLE,
} from '../../src/modules/reports/annual';
import { createPrismaMock, PrismaMock } from '../helpers/prisma-mock.helper';

describe('annual average rules', () => {
  it('simple average of the published periods; a period without average is ignored (not 0)', () => {
    expect(annualAverage([{ termNumber: 1, overallAverage: 12 }, { termNumber: 2, overallAverage: 14 }, { termNumber: 3, overallAverage: 10 }], 3)).toBe(12);
    expect(annualAverage([{ termNumber: 1, overallAverage: 12 }, { termNumber: 2, overallAverage: null }, { termNumber: 3, overallAverage: 14 }], 3)).toBe(13);
  });

  it('last period counts double when the school chose it', () => {
    // (10 + 12 + 2×16) / 4 = 13.5
    expect(annualAverage([{ termNumber: 1, overallAverage: 10 }, { termNumber: 2, overallAverage: 12 }, { termNumber: 3, overallAverage: 16 }], 3, 'LAST_DOUBLE')).toBe(13.5);
  });

  it('school settings default to simple average and 10/20', () => {
    expect(annualSettings(null)).toEqual({ weighting: 'EQUAL', promotionThreshold: 10 });
    expect(annualSettings({ annualWeighting: 'LAST_DOUBLE', promotionThreshold: 9.5 })).toEqual({ weighting: 'LAST_DOUBLE', promotionThreshold: 9.5 });
  });

  it('proposes the decision from the threshold', () => {
    expect(proposedDecision(9.6, 9.5)).toBe(ADMIS);
    expect(proposedDecision(9.4, 9.5)).toBe(REDOUBLE);
    expect(proposedDecision(null, 10)).toBeNull();
  });

  it('ranks with ties (1, 2, 2, 4) and leaves students without average unranked', () => {
    const r = rankWithTies([{ id: 'a', average: 15 }, { id: 'b', average: 12 }, { id: 'c', average: 12 }, { id: 'd', average: 9 }, { id: 'e', average: null }]);
    expect([r.get('a'), r.get('b'), r.get('c'), r.get('d'), r.get('e')]).toEqual([1, 2, 2, 4, undefined]);
  });

  it('expects 3 trimesters / 2 semesters', () => {
    expect(expectedTermCount('TRIMESTRE', [1])).toBe(3);
    expect(expectedTermCount('SEMESTRE', [1, 2])).toBe(2);
  });
});

describe('ReportsService.getAnnualReport', () => {
  let service: ReportsService;
  let prisma: PrismaMock;
  const cls = { id: 'class-1', name: '3ème', level: '3EME', teacher: { id: 'tit-1', name: 'Titulaire' } };
  const report = (termNumber: number, overallAverage: number | null, grades: any[] = [], extra: any = {}) => ({
    id: `r${termNumber}`, studentId: 'stu-1', classId: 'class-1', termNumber, termType: 'TRIMESTRE', termName: `${termNumber}e Trimestre`,
    overallAverage, class: cls, grades, councilDecision: null, councilDecisionManual: false, ...extra,
  });
  const grade = (score: number) => ({ subjectId: 'math', coefficient: 4, moyenneMatiere: score, subject: { nameFr: 'Maths', passMark: 10, maxScore: 20 } });

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: PdfService, useValue: {} },
        { provide: AttendanceService, useValue: {} },
        { provide: AiService, useValue: {} },
      ],
    }).compile();
    service = module.get(ReportsService);
    prisma.student.findFirst.mockResolvedValue({ id: 'stu-1', admissionNumber: 'M1', sex: 'F', user: { name: 'Ama' } });
    prisma.institution.findUnique.mockResolvedValue({ name: 'École', academicSettings: {} });
  });

  it('keeps T3 grades in the T3 column when T1 was never published', async () => {
    prisma.reportCard.findMany
      .mockResolvedValueOnce([report(2, 12, [grade(11)]), report(3, 14, [grade(15)])])
      .mockResolvedValueOnce([{ studentId: 'stu-1', termNumber: 2, overallAverage: 12 }, { studentId: 'stu-1', termNumber: 3, overallAverage: 14 }]);

    const res = await service.getAnnualReport('stu-1', '2026-2027', 'inst-1');

    expect(res.subjects[0].termAverages).toEqual([null, 11, 15]);
    expect(res.isComplete).toBe(false);
    expect(res.annualAverage).toBe(13);
  });

  it('computes the annual rank in the class and proposes the decision', async () => {
    prisma.reportCard.findMany
      .mockResolvedValueOnce([report(1, 12), report(2, 12), report(3, 12)])
      .mockResolvedValueOnce([
        ...[1, 2, 3].map((n) => ({ studentId: 'stu-1', termNumber: n, overallAverage: 12 })),
        ...[1, 2, 3].map((n) => ({ studentId: 'stu-2', termNumber: n, overallAverage: 15 })),
        ...[1, 2, 3].map((n) => ({ studentId: 'stu-3', termNumber: n, overallAverage: 8 })),
      ]);

    const res = await service.getAnnualReport('stu-1', '2026-2027', 'inst-1', { id: 'tit-1', role: Role.TEACHER });

    expect(res.annualRank).toBe(2);
    expect(res.annualClassSize).toBe(3);
    expect(res.councilDecision).toBe(ADMIS);
    expect(res.councilDecisionManual).toBe(false);
    expect(res.canEditDecision).toBe(true);
  });

  it('shows the decision typed by the school instead of the proposal', async () => {
    prisma.reportCard.findMany
      .mockResolvedValueOnce([report(1, 9), report(2, 9), report(3, 9, [], { councilDecision: 'Admis(e) sous réserve', councilDecisionManual: true })])
      .mockResolvedValueOnce([]);

    const res = await service.getAnnualReport('stu-1', '2026-2027', 'inst-1');

    expect(res.councilDecision).toBe('Admis(e) sous réserve');
    expect(res.proposedDecision).toBe(REDOUBLE);
  });

  describe('termRecap (previous terms on the term report card)', () => {
    const current = (termNumber: number, extra: any = {}) => ({
      studentId: 'stu-1', academicYear: '2026-2027', termNumber, termType: 'TRIMESTRE', overallAverage: 14, ...extra,
    });

    it('2nd term: shows the 1st term average, no annual average yet', async () => {
      prisma.reportCard.findMany.mockResolvedValueOnce([{ termNumber: 1, termType: 'TRIMESTRE', overallAverage: 11 }]);

      const r = await service.termRecap(current(2), 'inst-1');

      expect(r.previous).toEqual([{ termNumber: 1, label: 'Moyenne du 1er trimestre', average: 11 }]);
      expect(r.isLastTerm).toBe(false);
      expect(r.annualAverage).toBeNull();
    });

    it('3rd term: 1st and 2nd averages, annual average and proposed decision', async () => {
      prisma.reportCard.findMany.mockResolvedValueOnce([
        { termNumber: 1, termType: 'TRIMESTRE', overallAverage: 10 },
        { termNumber: 2, termType: 'TRIMESTRE', overallAverage: 12 },
      ]);

      const r = await service.termRecap(current(3), 'inst-1');

      expect(r.previous.map((p) => p.label)).toEqual(['Moyenne du 1er trimestre', 'Moyenne du 2e trimestre']);
      expect(r.annualAverage).toBe(12);
      expect(r.councilDecision).toBe(ADMIS);
    });

    it('3rd term: keeps the decision typed by the school', async () => {
      prisma.reportCard.findMany.mockResolvedValueOnce([]);

      const r = await service.termRecap(current(3, { councilDecision: 'Exclu(e)', councilDecisionManual: true }), 'inst-1');

      expect(r.councilDecision).toBe('Exclu(e)');
    });
  });

  describe('setCouncilDecision (on the last-term report card)', () => {
    const t = (termNumber: number) => ({
      id: 'r' + termNumber, classId: 'class-1', studentId: 'stu-1', academicYear: '2026-2027', termNumber, termType: 'TRIMESTRE',
      overallAverage: 12, councilDecision: null, councilDecisionManual: false,
    });

    it('saves the decision typed by the admin on the 3rd-term report card, even unpublished', async () => {
      prisma.reportCard.findFirst.mockResolvedValue(t(3));
      prisma.reportCard.update.mockResolvedValue({});
      prisma.reportCard.findMany.mockResolvedValue([]);

      const r = await service.setCouncilDecision('r3', 'Admis(e) sous réserve', 'inst-1', 'admin-1', Role.ADMIN);

      expect(prisma.reportCard.update).toHaveBeenCalledWith({ where: { id: 'r3' }, data: { councilDecision: 'Admis(e) sous réserve', councilDecisionManual: true } });
      expect(r.councilDecision).toBe('Admis(e) sous réserve');
      expect(r.councilDecisionManual).toBe(true);
    });

    it('refuses a decision on a 1st or 2nd term report card', async () => {
      prisma.reportCard.findFirst.mockResolvedValue(t(2));

      await expect(service.setCouncilDecision('r2', 'Admis', 'inst-1', 'admin-1', Role.ADMIN)).rejects.toThrow('dernière période');
    });
  });

  describe('class council (conseil de classe)', () => {
    const rc = (studentId: string, termNumber: number, extra: any = {}) => ({
      id: `${studentId}-t${termNumber}`, studentId, termNumber, termType: 'TRIMESTRE', status: 'PUBLISHED', overallAverage: 12,
      attendanceAbsentHours: 2, warnings: null, councilDecision: null, councilDecisionManual: false, grades: [], ...extra,
    });

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue({ id: 'class-1', name: '3ème', level: '3EME', teacherId: 'tit-1', teacher: { id: 'tit-1', name: 'Titulaire' } });
      prisma.classStudent.findMany.mockResolvedValue([
        { studentId: 'a', student: { admissionNumber: 'A', sex: 'F', user: { name: 'Ama' } } },
        { studentId: 'b', student: { admissionNumber: 'B', sex: 'M', user: { name: 'Kofi' } } },
      ]);
    });

    it('uses the live average of an unpublished 3rd-term bulletin, ranks and proposes decisions', async () => {
      prisma.reportCard.findMany.mockResolvedValue([
        rc('a', 1, { overallAverage: 8 }), rc('a', 2, { overallAverage: 9 }),
        // T3 en brouillon : moyenne calculée depuis les notes (14 × 2 + 10 × 1) / 3 = 12,67
        rc('a', 3, { status: 'DRAFT', overallAverage: null, grades: [{ weightedScore: 28, coefficient: 2 }, { weightedScore: 10, coefficient: 1 }] }),
        rc('b', 1, { overallAverage: 14 }), rc('b', 2, { overallAverage: 14 }), rc('b', 3, { overallAverage: 14 }),
      ]);

      const sheet = await service.councilSheet('class-1', '2026-2027', 'inst-1', 'tit-1', Role.TEACHER);
      const a = sheet.rows.find((r) => r.studentId === 'a')!;

      expect(a.terms[2]).toEqual({ termNumber: 3, average: 12.67, published: false });
      expect(a.annualAverage).toBe(9.89);
      expect(a.councilDecision).toBe(REDOUBLE);
      expect(a.locked).toBe(false);
      expect(sheet.rows[0].studentId).toBe('b'); // classé 1er
      expect(sheet.rows.find((r) => r.studentId === 'b')!.locked).toBe(true); // T3 publié
    });

    it('proposes no decision in the middle of the year (periods without average)', async () => {
      prisma.reportCard.findMany.mockResolvedValue([rc('a', 1, { overallAverage: 15 })]);

      const sheet = await service.councilSheet('class-1', '2026-2027', 'inst-1', 'tit-1', Role.TEACHER);
      const a = sheet.rows.find((r) => r.studentId === 'a')!;

      expect(a.complete).toBe(false);
      expect(a.proposedDecision).toBeNull();
      expect(a.councilDecision).toBeNull();
    });

    it('saves decisions only on unpublished last-term bulletins', async () => {
      prisma.reportCard.findMany.mockResolvedValue([
        rc('a', 3, { status: 'REVIEW' }),
        rc('b', 3, { status: 'PUBLISHED' }),
      ]);
      prisma.reportCard.update.mockImplementation((args: any) => args);

      const res = await service.saveCouncil('class-1', '2026-2027', [
        { studentId: 'a', decision: 'Admis(e) sous réserve' },
        { studentId: 'b', decision: 'Exclu(e)' },
      ], 'inst-1', 'tit-1', Role.TEACHER);

      expect(res.saved).toBe(1);
      expect(res.locked).toBe(1);
      expect(prisma.reportCard.update).toHaveBeenCalledTimes(1);
      expect(prisma.reportCard.update).toHaveBeenCalledWith({ where: { id: 'a-t3' }, data: { councilDecision: 'Admis(e) sous réserve', councilDecisionManual: true } });
    });

    it('refuses a teacher who is not the titulaire', async () => {
      prisma.class.findFirst.mockResolvedValue({ teacherId: 'someone-else' });

      await expect(service.councilSheet('class-1', '2026-2027', 'inst-1', 'tit-1', Role.TEACHER)).rejects.toThrow();
    });
  });

  it("limits a parent to their own child's annual report", async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(service.getAnnualReport('stu-1', '2026-2027', 'inst-1', { id: 'parent-9', role: Role.PARENT })).rejects.toThrow(NotFoundException);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'stu-1', institutionId: 'inst-1', parentId: 'parent-9' },
    }));
  });
});
