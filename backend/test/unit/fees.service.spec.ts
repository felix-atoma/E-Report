import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FeesService } from '../../src/modules/fees/fees.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../helpers/prisma-mock.helper';
import { studentFixture, institutionFixture } from '../fixtures/institution.fixture';

describe('FeesService', () => {
  let service: FeesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FeesService>(FeesService);
  });

  // ─── getStudentFeeSummary ────────────────────────────────────────────────

  describe('getStudentFeeSummary', () => {
    beforeEach(() => {
      prisma.student.findFirst.mockResolvedValue(studentFixture);
    });

    it('returns PAID status when full amount is paid', async () => {
      prisma.studentFee.findMany.mockResolvedValue([
        { amountDue: '45000', isExempt: false, fee: { name: 'Scolarité', feeType: 'TUITION', currency: 'XOF' } },
      ]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '45000', academicYear: '2024-2025', term: null, paymentDate: new Date() }]);

      const result = await service.getStudentFeeSummary(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.paymentStatus).toBe('PAID');
      expect(result.totalDue).toBe(45000);
      expect(result.totalPaid).toBe(45000);
      expect(result.balance).toBe(0);
    });

    it('returns PARTIAL status when partial amount is paid', async () => {
      prisma.studentFee.findMany.mockResolvedValue([
        { amountDue: '45000', isExempt: false, fee: { name: 'Scolarité', feeType: 'TUITION', currency: 'XOF' } },
      ]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '15000', academicYear: '2024-2025', term: null, paymentDate: new Date() }]);

      const result = await service.getStudentFeeSummary(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.paymentStatus).toBe('PARTIAL');
      expect(result.balance).toBe(30000);
    });

    it('returns UNPAID status when no payment made', async () => {
      prisma.studentFee.findMany.mockResolvedValue([
        { amountDue: '45000', isExempt: false, fee: { name: 'Scolarité', feeType: 'TUITION', currency: 'XOF' } },
      ]);
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getStudentFeeSummary(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.paymentStatus).toBe('UNPAID');
      expect(result.balance).toBe(45000);
    });

    it('returns EXEMPT when student has exemption', async () => {
      prisma.studentFee.findMany.mockResolvedValue([
        { amountDue: '45000', isExempt: true, fee: { name: 'Scolarité', feeType: 'TUITION', currency: 'XOF' } },
      ]);
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getStudentFeeSummary(studentFixture.id, institutionFixture.id);

      expect(result.paymentStatus).toBe('EXEMPT');
    });

    it('aggregates multiple fees correctly', async () => {
      prisma.studentFee.findMany.mockResolvedValue([
        { amountDue: '45000', isExempt: false, fee: { name: 'Scolarité', feeType: 'TUITION', currency: 'XOF' } },
        { amountDue: '15000', isExempt: false, fee: { name: 'Inscription', feeType: 'REGISTRATION', currency: 'XOF' } },
      ]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '60000', academicYear: '2024-2025', term: null, paymentDate: new Date() }]);

      const result = await service.getStudentFeeSummary(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.totalDue).toBe(60000);
      expect(result.totalPaid).toBe(60000);
      expect(result.paymentStatus).toBe('PAID');
    });

    it('throws NotFoundException when student not found in institution', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.getStudentFeeSummary('bad-id', institutionFixture.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── assignToClass ───────────────────────────────────────────────────────

  describe('assignToClass', () => {
    const feeFixture = {
      id: 'fee-001',
      amount: '45000',
      institutionId: institutionFixture.id,
    };

    it('creates StudentFee records for all enrolled students', async () => {
      prisma.fee.findFirst.mockResolvedValue(feeFixture);
      prisma.classStudent.findMany.mockResolvedValue([
        { studentId: 'stu-1' },
        { studentId: 'stu-2' },
        { studentId: 'stu-3' },
      ]);
      prisma.studentFee.createMany.mockResolvedValue({ count: 3 });

      const result = await service.assignToClass(
        feeFixture.id,
        { classId: 'class-001', academicYear: '2024-2025' },
        institutionFixture.id,
      );

      expect(result.assigned).toBe(3);
      expect(prisma.studentFee.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ studentId: 'stu-1', feeId: feeFixture.id }),
          ]),
          skipDuplicates: true,
        }),
      );
    });

    it('returns { assigned: 0 } when no students are enrolled', async () => {
      prisma.fee.findFirst.mockResolvedValue(feeFixture);
      prisma.classStudent.findMany.mockResolvedValue([]);

      const result = await service.assignToClass(
        feeFixture.id,
        { classId: 'empty-class', academicYear: '2024-2025' },
        institutionFixture.id,
      );

      expect(result.assigned).toBe(0);
      expect(prisma.studentFee.createMany).not.toHaveBeenCalled();
    });
  });
});
