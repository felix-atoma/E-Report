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
    prisma.grade.findMany.mockResolvedValue([]);
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

    it('refuses a decimal coefficient (coefficients are whole numbers)', async () => {
      await expect(
        service.saveSubjectGrades(exam.id, 'math', [{ studentId: 'stu-1', score: 12 }], INST, 2.5, 'TEACHER', 'teacher-1'),
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

    it('proposes the report-card coefficient for a subject with no marks yet, otherwise 1', async () => {
      prisma.classSubject.findMany.mockResolvedValue([
        { subject: { id: 'math', nameFr: 'Maths', nameEn: 'Maths', code: 'M', maxScore: 20, category: null } },
        { subject: { id: 'svt', nameFr: 'SVT', nameEn: 'Biology', code: 'S', maxScore: 20, category: null } },
      ]);
      prisma.grade.findMany.mockResolvedValue([{ subjectId: 'math', coefficient: 4 }]);
      const sheet = await service.getGradeSheet(exam.id, INST);
      expect(Object.fromEntries(sheet.subjects.map((x: any) => [x.id, x.coefficient]))).toEqual({ math: 4, svt: 1 });
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

  describe('primary: English is its own composition', () => {
    const cs = (id: string, nameFr: string, maxScore: number, category: string | null = null) =>
      ({ subject: { id, nameFr, nameEn: nameFr, code: id, maxScore, category } });
    const grade = (studentId: string, subjectId: string, score: number) => ({ studentId, subjectId, score, coefficient: 1 });
    const primaryExam = (examType: string) => ({ ...exam, examType, class: { name: 'CM2' } });

    beforeEach(() => {
      prisma.classSubject.findMany.mockResolvedValue([
        cs('fr', 'Français', 20), cs('calc', 'Calcul', 10),
        cs('eg', 'English Grammar', 20), cs('rc', 'Reading Comprehension', 20, 'ANGLAIS'),
      ]);
      // stu-1 meilleur en français/calcul, stu-2 bien meilleur en anglais
      prisma.mockExamGrade.findMany.mockResolvedValue([
        grade('stu-1', 'fr', 16), grade('stu-1', 'calc', 8), grade('stu-1', 'eg', 4), grade('stu-1', 'rc', 6),
        grade('stu-2', 'fr', 12), grade('stu-2', 'calc', 6), grade('stu-2', 'eg', 18), grade('stu-2', 'rc', 15),
      ]);
    });

    it('composition mensuelle: no English subject, average on 10 without English', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(primaryExam('COMPOSITION_MENSUELLE'));
      const sheet = await service.getGradeSheet(exam.id, INST);

      expect(sheet.subjects.map((s: any) => s.id)).toEqual(['fr', 'calc']);
      const s1 = sheet.students.find((s) => s.studentId === 'stu-1')!;
      expect(s1.average).toBe(8);   // (16 + 8) / 30 × 10
      expect(s1.rank).toBe(1);
    });

    it('composition anglais: only English subjects, average in %, own rank', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(primaryExam('COMPOSITION_ANGLAIS'));
      const sheet = await service.getGradeSheet(exam.id, INST);

      expect(sheet.exam.scale).toBe(100);
      expect(sheet.subjects.map((s: any) => s.id)).toEqual(['eg', 'rc']);
      const s1 = sheet.students.find((s) => s.studentId === 'stu-1')!;
      const s2 = sheet.students.find((s) => s.studentId === 'stu-2')!;
      expect(s2.average).toBe(82.5); // (18 + 15) / 40 × 100
      expect(s1.average).toBe(25);   // (4 + 6) / 40 × 100
      expect(s2.rank).toBe(1);
      expect(s1.rank).toBe(2);
      // Composition d'anglais : appréciations en anglais
      expect(s2.appreciation).toBe('Very Good');       // 82,5 % → 16,5/20
      expect(s1.appreciation).toBe('Very Poor');       // 25 % → 5/20 : très insuffisant
      expect(s2.grades.find((g: any) => g.subjectId === 'rc')!.appreciation).toBe('Good'); // 15/20
    });

    it('refuses an English composition for a secondary class', async () => {
      prisma.class.findFirst.mockResolvedValue({ id: 'class-1', level: '3ème' });
      await expect(service.create(
        { classId: 'class-1', examType: 'COMPOSITION_ANGLAIS', label: 'x', academicYear: '2026-2027' } as any, 'u1', INST,
      )).rejects.toThrow(BadRequestException);
    });

    it('relevés and palmarès leave out a subject nobody was marked in (e.g. English Writing not taken)', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(primaryExam('COMPOSITION_ANGLAIS'));
      prisma.classSubject.findMany.mockResolvedValue([
        cs('eg', 'English Grammar', 20), cs('ew', 'English Writing', 20), cs('rc', 'Reading Comprehension', 20, 'ANGLAIS'),
      ]);
      const sheet = await (service as any).resultsSheet(exam.id, INST);
      expect(sheet.subjects.map((s: any) => s.id)).toEqual(['eg', 'rc']);
      expect(sheet.students[0].grades.map((g: any) => g.subjectId)).toEqual(['eg', 'rc']);
      // La fiche de saisie, elle, garde la matière
      const entry = await service.getGradeSheet(exam.id, INST);
      expect(entry.subjects.map((s: any) => s.id)).toEqual(['eg', 'ew', 'rc']);
    });

    it('a devoir surveillé keeps every subject', async () => {
      prisma.mockExam.findFirst.mockResolvedValue(exam);
      const sheet = await service.getGradeSheet(exam.id, INST);
      expect(sheet.subjects).toHaveLength(4);
    });
  });

  describe('teacher signatures on relevés', () => {
    const sign = (signedById: string, name: string, image: string) =>
      ({ signedById, signedByName: name, signatureData: image, signedBy: { name } });

    it('one signature per teacher, class teacher first (latest kept)', async () => {
      prisma.class.findUnique.mockResolvedValue({ teacherId: 'tit', teacher: { name: 'Michel Gadri' } });
      prisma.mockExamSubjectFiche.findMany.mockResolvedValue([
        sign('eng', 'GADESSE Yawa', 'img-eng-new'), sign('tit', 'Michel Gadri', 'img-tit'), sign('eng', 'GADESSE Yawa', 'img-eng-old'),
      ]);
      const sigs = await (service as any).teacherSignatures('exam-1', 'class-1');
      expect(sigs).toEqual([
        { name: 'Michel Gadri', image: 'img-tit', classTeacher: true, fromSession: true },
        { name: 'GADESSE Yawa', image: 'img-eng-new', classTeacher: false, fromSession: true },
      ]);
    });

    it('English test signed only by subject teachers: class teacher box gets his latest signature', async () => {
      prisma.class.findUnique.mockResolvedValue({ teacherId: 'tit', teacher: { name: 'Michel Gadri' } });
      prisma.mockExamSubjectFiche.findMany.mockResolvedValue([sign('kad', 'KADJA BANIKY', 'img-kad')]);
      prisma.gradeFiche.findFirst.mockResolvedValue({ signatureData: 'img-term', signedAt: new Date('2026-10-01') });
      prisma.mockExamSubjectFiche.findFirst.mockResolvedValue(null);
      const sigs = await (service as any).teacherSignatures('exam-1', 'class-1');
      expect(sigs).toEqual([
        { name: 'Michel Gadri', image: 'img-term', classTeacher: true, fromSession: false },
        { name: 'KADJA BANIKY', image: 'img-kad', classTeacher: false, fromSession: true },
      ]);
    });

    it('nobody signed yet: falls back to the class teacher latest known signature', async () => {
      prisma.class.findUnique.mockResolvedValue({ teacherId: 'tit', teacher: { name: 'Michel Gadri' } });
      prisma.mockExamSubjectFiche.findMany.mockResolvedValue([]);
      prisma.gradeFiche.findFirst.mockResolvedValue({ signatureData: 'img-term', signedAt: new Date('2026-10-01') });
      prisma.mockExamSubjectFiche.findFirst.mockResolvedValue({ signatureData: 'img-old-compo', signedAt: new Date('2026-09-01') });
      const sigs = await (service as any).teacherSignatures('exam-1', 'class-1');
      expect(sigs).toEqual([{ name: 'Michel Gadri', image: 'img-term', classTeacher: true, fromSession: false }]);
    });

    it('no signature anywhere: empty (blank line kept on the relevé)', async () => {
      prisma.class.findUnique.mockResolvedValue({ teacherId: null, teacher: null });
      prisma.mockExamSubjectFiche.findMany.mockResolvedValue([]);
      expect(await (service as any).teacherSignatures('exam-1', 'class-1')).toEqual([]);
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

  describe('DS marks also fill the « Devoir » column of the term grade sheet', () => {
    it('reads the term from the session name, then from the date', () => {
      const t = (label: string, examDate?: string) => service.dsTermNumber({ label, academicYear: '2026-2027', examDate: examDate ? new Date(examDate) : null } as any);
      expect(t('Devoir Surveillé du Premier Trimestre')).toBe(1);
      expect(t('DS du 2e trimestre')).toBe(2);
      expect(t('Devoir surveillé — trimestre 3')).toBe(3);
      expect(t('Devoir surveillé', '2027-02-10')).toBe(2);
    });

    beforeEach(() => {
      prisma.classSubject.findFirst.mockResolvedValue({ id: 'cs' });
      prisma.mockExam.findFirst.mockResolvedValue({ ...exam, label: 'Devoir Surveillé du Premier Trimestre' });
      prisma.class.findUnique.mockResolvedValue({ institutionId: INST, institution: { academicSettings: null } });
      prisma.reportCard.findFirst.mockResolvedValue({ termName: '1er trimestre', termType: 'TRIMESTRE' });
      prisma.subject.findUnique.mockResolvedValue({ nameFr: 'Maths', maxScore: 20, hasCoefficient: true });
      prisma.reportCard.findUnique.mockResolvedValue({ id: 'rc-1' });
      prisma.grade.findUnique.mockResolvedValue({ noteInterro1: 10, noteComposition: null, coefficient: 3 });
      prisma.grade.findMany.mockResolvedValue([]);
      prisma.mockExamSubjectFiche.findUnique.mockResolvedValue(null);
      prisma.$transaction = jest.fn().mockResolvedValue([]) as any;
    });

    it('copies the DS mark as « Devoir » and recomputes the subject average', async () => {
      prisma.gradeFiche.findUnique.mockResolvedValue(null);
      const res = await service.saveSubjectGrades(exam.id, 'math', [{ studentId: 'stu-1', score: 14 }], INST, 3, 'TEACHER', 'teacher-1');
      expect(prisma.grade.upsert).toHaveBeenCalledTimes(1);
      const data = prisma.grade.upsert.mock.calls[0][0].update;
      expect(data.noteDevoir).toBe(14);
      expect(data.moyenneMatiere).toBe(12.67);           // (10 × 1 + 14 × 2) / 3
      expect(data.coefficient).toBe(3);
      expect(data.appreciation).toBe('Assez Bien');
      expect(res.message).toContain('colonne « Devoir »');
    });

    it('never touches a term grade sheet that is already signed', async () => {
      prisma.gradeFiche.findUnique.mockResolvedValue({ signedAt: new Date() });
      const res = await service.saveSubjectGrades(exam.id, 'math', [{ studentId: 'stu-1', score: 14 }], INST, 3, 'TEACHER', 'teacher-1');
      expect(prisma.grade.upsert).not.toHaveBeenCalled();
      expect(res.message).toContain('déjà signée');
    });
  });
});
