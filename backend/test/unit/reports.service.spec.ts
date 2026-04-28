import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PdfService } from '../../src/modules/pdf/pdf.service';
import { Role } from '../../src/common/enums/role.enum';
import { createPrismaMock, PrismaMock } from '../helpers/prisma-mock.helper';
import {
  reportCardFixture,
  classFixture,
  studentFixture,
  teacherUserFixture,
  subjectMathFixture,
  subjectFrFixture,
  institutionFixture,
  parentUserFixture,
} from '../fixtures/institution.fixture';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaMock;
  let events: { emit: jest.Mock };
  let pdf: { generateReportCardPdf: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    events = { emit: jest.fn() };
    pdf = { generateReportCardPdf: jest.fn().mockResolvedValue('http://localhost/uploads/report-001.pdf') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        { provide: PdfService, useValue: pdf },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a report card in DRAFT status', async () => {
      prisma.class.findFirst.mockResolvedValue(classFixture);
      prisma.student.findFirst.mockResolvedValue(studentFixture);
      prisma.reportCard.create.mockResolvedValue({ ...reportCardFixture, status: 'DRAFT' });

      const result = await service.create(
        {
          studentId: studentFixture.id,
          classId: classFixture.id,
          academicYear: '2024-2025',
          termType: 'TRIMESTRE' as any,
          termNumber: 1,
          termName: '1er Trimestre',
        },
        institutionFixture.id,
        teacherUserFixture.id,
      );

      expect(result.status).toBe('DRAFT');
      expect(prisma.reportCard.create).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when class does not belong to institution', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { studentId: 's1', classId: 'bad-id', academicYear: '2024-2025', termType: 'TRIMESTRE' as any, termNumber: 1, termName: 'T1' },
          institutionFixture.id,
          teacherUserFixture.id,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── submit ─────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('moves a DRAFT report to REVIEW', async () => {
      prisma.reportCard.findFirst.mockResolvedValue({ ...reportCardFixture, status: 'DRAFT', class: classFixture });
      prisma.reportCard.update.mockResolvedValue({ ...reportCardFixture, status: 'REVIEW' });

      const result = await service.submit(reportCardFixture.id, institutionFixture.id, teacherUserFixture.id, Role.TEACHER);

      expect(prisma.reportCard.update).toHaveBeenCalledWith({
        where: { id: reportCardFixture.id },
        data: { status: 'REVIEW' },
      });
    });

    it('throws BadRequestException when report is not DRAFT', async () => {
      prisma.reportCard.findFirst.mockResolvedValue({ ...reportCardFixture, status: 'REVIEW', class: classFixture });

      await expect(
        service.submit(reportCardFixture.id, institutionFixture.id, teacherUserFixture.id, Role.TEACHER),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when teacher does not own or teach the report', async () => {
      prisma.reportCard.findFirst.mockResolvedValue({
        ...reportCardFixture,
        status: 'DRAFT',
        createdById: 'other-teacher',
        class: classFixture,
      });
      prisma.class.findFirst.mockResolvedValue(null); // teacher is not the class teacher either

      await expect(
        service.submit(reportCardFixture.id, institutionFixture.id, teacherUserFixture.id, Role.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── publish — grade calculation ────────────────────────────────────────

  describe('publish — grade calculation and mention', () => {
    const gradesMathFr = [
      {
        score: 16, coefficient: 3, weightedScore: 48,
        teacherComment: null,
        subject: { nameFr: 'Mathématiques', passMark: 10 },
      },
      {
        score: 12, coefficient: 2, weightedScore: 24,
        teacherComment: null,
        subject: { nameFr: 'Français', passMark: 10 },
      },
    ];
    // average = (48 + 24) / (3 + 2) = 72 / 5 = 14.40 → mention "Bien"

    function buildPublishMocks(grades = gradesMathFr) {
      const reportWithGrades = {
        ...reportCardFixture,
        status: 'REVIEW',
        grades,
        student: {
          ...studentFixture,
          user: { name: 'Ama Kofi' },
          parent: { id: parentUserFixture.id },
        },
        class: { name: classFixture.name },
      };

      prisma.reportCard.findFirst.mockResolvedValue(reportWithGrades);
      prisma.reportCard.findMany.mockResolvedValue([]); // no siblings yet
      prisma.reportCard.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...reportCardFixture, ...data }),
      );
      prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));
      prisma.institution.findUnique.mockResolvedValue(institutionFixture);
    }

    it('computes overallAverage correctly (weighted)', async () => {
      buildPublishMocks();

      const result = await service.publish(reportCardFixture.id, institutionFixture.id, '', Role.ADMIN);

      // Find the final update call (the one that sets status PUBLISHED)
      const finalCall = prisma.reportCard.update.mock.calls.find(
        ([args]) => args.data?.status === 'PUBLISHED',
      );
      expect(finalCall).toBeDefined();
      expect(finalCall![0].data.overallAverage).toBeCloseTo(14.4, 1);
    });

    it('sets mention to "Bien" for average 14.40', async () => {
      buildPublishMocks();

      await service.publish(reportCardFixture.id, institutionFixture.id, '', Role.ADMIN);

      const finalCall = prisma.reportCard.update.mock.calls.find(
        ([args]) => args.data?.status === 'PUBLISHED',
      );
      expect(finalCall![0].data.mention).toBe('Bien');
    });

    const mentionCases: [number[], string][] = [
      [[18, 1], 'Excellent'],
      [[16, 1], 'Très Bien'],
      [[14, 1], 'Bien'],
      [[12, 1], 'Assez Bien'],
      [[10, 1], 'Passable'],
      [[9, 1], 'Insuffisant'],
    ];

    it.each(mentionCases)('score %s/20 → mention "%s"', async ([score], expectedMention) => {
      buildPublishMocks([{ score, coefficient: 1, weightedScore: score, teacherComment: null, subject: { nameFr: 'Test', passMark: 10 } }]);

      await service.publish(reportCardFixture.id, institutionFixture.id, '', Role.ADMIN);

      const finalCall = prisma.reportCard.update.mock.calls.find(
        ([args]) => args.data?.status === 'PUBLISHED',
      );
      expect(finalCall![0].data.mention).toBe(expectedMention);
    });

    it('assigns classRank=1 when first report published in class', async () => {
      buildPublishMocks();

      await service.publish(reportCardFixture.id, institutionFixture.id, '', Role.ADMIN);

      const finalCall = prisma.reportCard.update.mock.calls.find(
        ([args]) => args.data?.status === 'PUBLISHED',
      );
      expect(finalCall![0].data.classRank).toBe(1);
      expect(finalCall![0].data.classSize).toBe(1);
    });

    it('ranks higher average first when siblings exist', async () => {
      const siblingId = 'report-002';
      prisma.reportCard.findFirst.mockResolvedValue({
        ...reportCardFixture,
        status: 'REVIEW',
        grades: [{ score: 16, coefficient: 3, weightedScore: 48, teacherComment: null, subject: { nameFr: 'Math', passMark: 10 } }],
        student: {
          ...studentFixture,
          user: { name: 'Ama' },
          parent: { id: parentUserFixture.id },
        },
        class: { name: classFixture.name },
      });
      // Sibling already published with average 10 (lower)
      prisma.reportCard.findMany.mockResolvedValue([{ id: siblingId, overallAverage: 10 }]);
      prisma.reportCard.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...reportCardFixture, ...data }),
      );
      prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));
      prisma.institution.findUnique.mockResolvedValue(institutionFixture);

      await service.publish(reportCardFixture.id, institutionFixture.id, '', Role.ADMIN);

      // The current report has avg 16 > 10, so it should be rank 1
      const finalCall = prisma.reportCard.update.mock.calls.find(
        ([args]) => args.data?.status === 'PUBLISHED',
      );
      expect(finalCall![0].data.classRank).toBe(1);
      expect(finalCall![0].data.classSize).toBe(2);
    });

    it('throws ForbiddenException if role is not ADMIN', async () => {
      prisma.reportCard.findFirst.mockResolvedValue({ ...reportCardFixture, status: 'REVIEW', grades: [] });

      await expect(
        service.publish(reportCardFixture.id, institutionFixture.id, teacherUserFixture.id, Role.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when report is not in REVIEW status', async () => {
      prisma.reportCard.findFirst.mockResolvedValue({ ...reportCardFixture, status: 'DRAFT', grades: [] });

      await expect(
        service.publish(reportCardFixture.id, institutionFixture.id, '', Role.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('emits report.published event after publishing', async () => {
      buildPublishMocks();

      await service.publish(reportCardFixture.id, institutionFixture.id, '', Role.ADMIN);

      expect(events.emit).toHaveBeenCalledWith('report.published', expect.objectContaining({
        institutionId: institutionFixture.id,
      }));
    });
  });

  // ─── findAll — role scoping ──────────────────────────────────────────────

  describe('findAll — role scoping', () => {
    it('returns all institution reports for ADMIN', async () => {
      prisma.reportCard.findMany.mockResolvedValue([reportCardFixture]);

      const result = await service.findAll(institutionFixture.id, 'admin-id', Role.ADMIN, {});

      expect(prisma.reportCard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { class: { institutionId: institutionFixture.id } } }),
      );
    });

    it('scopes PARENT to their children only', async () => {
      prisma.student.findMany.mockResolvedValue([{ id: studentFixture.id }]);
      prisma.reportCard.findMany.mockResolvedValue([reportCardFixture]);

      await service.findAll(institutionFixture.id, parentUserFixture.id, Role.PARENT, {});

      expect(prisma.reportCard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: { in: [studentFixture.id] },
          }),
        }),
      );
    });
  });
});
