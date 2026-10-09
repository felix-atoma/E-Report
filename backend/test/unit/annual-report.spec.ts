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

  it("limits a parent to their own child's annual report", async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(service.getAnnualReport('stu-1', '2026-2027', 'inst-1', { id: 'parent-9', role: Role.PARENT })).rejects.toThrow(NotFoundException);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'stu-1', institutionId: 'inst-1', parentId: 'parent-9' },
    }));
  });
});
