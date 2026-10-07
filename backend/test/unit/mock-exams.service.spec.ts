import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MockExamsService } from '../../src/modules/mock-exams/mock-exams.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PdfService } from '../../src/modules/pdf/pdf.service';
import { createPrismaMock, PrismaMock } from '../helpers/prisma-mock.helper';

const INST = 'inst-1';
const exam = { id: 'exam-1', classId: 'class-1', academicYear: '2026-2027', examType: 'DEVOIR_SURVEILLE', status: 'DRAFT', class: { name: '3ème' } };
const enrol = (studentId: string, academicYear = '2026-2027') => ({
  studentId, academicYear, student: { id: studentId, admissionNumber: studentId, user: { name: studentId } },
});

describe('MockExamsService', () => {
  let service: MockExamsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockExamsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PdfService, useValue: {} },
      ],
    }).compile();
    service = module.get(MockExamsService);

    prisma.mockExam.findFirst.mockResolvedValue(exam);
    prisma.classStudent.findMany.mockResolvedValue([enrol('stu-1'), enrol('stu-2')]);
    prisma.subject.findMany.mockResolvedValue([{ id: 'math', nameFr: 'Maths', maxScore: 20 }, { id: 'svt', nameFr: 'SVT', maxScore: 20 }]);
    prisma.mockExamSubjectFiche.findMany.mockResolvedValue([]);
    prisma.mockExamSubjectFiche.findUnique.mockResolvedValue(null);
    prisma.mockExamGrade.upsert.mockResolvedValue({});
  });

  describe('saveGrades (whole sheet)', () => {
    it('refuses a teacher writing a subject they do not teach', async () => {
      prisma.classSubject.findFirst.mockResolvedValue(null);

      await expect(
        service.saveGrades(exam.id, { grades: [{ studentId: 'stu-1', subjectId: 'svt', score: 12 }] }, INST, 'TEACHER', 'teacher-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.mockExamGrade.upsert).not.toHaveBeenCalled();
    });

    it('leaves a signed subject untouched and saves the others', async () => {
      prisma.classSubject.findFirst.mockResolvedValue({ id: 'cs' });
      prisma.mockExamSubjectFiche.findMany.mockResolvedValue([{ subjectId: 'math' }]);

      const res = await service.saveGrades(exam.id, {
        grades: [
          { studentId: 'stu-1', subjectId: 'math', score: 5 },
          { studentId: 'stu-1', subjectId: 'svt', score: 14 },
        ],
      }, INST, 'TEACHER', 'teacher-1');

      expect(prisma.mockExamGrade.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.mockExamGrade.upsert.mock.calls[0][0].create.subjectId).toBe('svt');
      expect(res.message).toContain('signée');
    });

    it('refuses grades for a student who is not in the class', async () => {
      await expect(
        service.saveGrades(exam.id, { grades: [{ studentId: 'stranger', subjectId: 'math', score: 10 }] }, INST, 'ADMIN', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveSubjectGrades (fiche)', () => {
    beforeEach(() => prisma.classSubject.findFirst.mockResolvedValue({ id: 'cs' }));

    it('refuses a score that is not a number', async () => {
      await expect(
        service.saveSubjectGrades(exam.id, 'math', [{ studentId: 'stu-1', score: 'abc' as any }], INST, 1, 'TEACHER', 'teacher-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses an invalid coefficient', async () => {
      await expect(
        service.saveSubjectGrades(exam.id, 'math', [{ studentId: 'stu-1', score: 12 }], INST, -3, 'TEACHER', 'teacher-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('grade sheet students', () => {
    beforeEach(() => {
      prisma.classSubject.findMany.mockResolvedValue([]);
      prisma.mockExamGrade.findMany.mockResolvedValue([]);
    });

    it('only lists students enrolled for the session year', async () => {
      prisma.classStudent.findMany.mockResolvedValue([enrol('old', '2025-2026'), enrol('stu-1')]);

      const sheet = await service.getGradeSheet(exam.id, INST);

      expect(sheet.students.map((s) => s.studentId)).toEqual(['stu-1']);
    });

    it('falls back to the latest year when the session was created with a year nobody is enrolled in', async () => {
      prisma.mockExam.findFirst.mockResolvedValue({ ...exam, academicYear: '2025-2026' });
      prisma.classStudent.findMany.mockResolvedValue([enrol('stu-1', '2026-2027')]);

      const sheet = await service.getGradeSheet(exam.id, INST);

      expect(sheet.students.map((s) => s.studentId)).toEqual(['stu-1']);
    });
  });

  describe('updateType', () => {
    it('refuses turning a primary session into a devoir surveillé', async () => {
      prisma.class.findUnique.mockResolvedValue({ level: 'CM2' });

      await expect(service.updateType(exam.id, INST, 'DEVOIR_SURVEILLE')).rejects.toThrow(BadRequestException);
    });

    it('refuses an unknown type', async () => {
      await expect(service.updateType(exam.id, INST, 'NOPE')).rejects.toThrow(BadRequestException);
    });
  });
});
