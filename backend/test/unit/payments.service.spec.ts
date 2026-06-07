import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotchpayService } from '../../src/modules/payments/notchpay.service';
import { createPrismaMock, PrismaMock } from '../helpers/prisma-mock.helper';
import {
  studentFixture,
  institutionFixture,
  teacherUserFixture,
} from '../fixtures/institution.fixture';

const notchpayMock = {
  createTransaction: jest.fn(),
  verifyWebhookSignature: jest.fn().mockReturnValue(true),
  verifyTransaction: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotchpayService, useValue: notchpayMock },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // ─── record ─────────────────────────────────────────────────────────────

  describe('record', () => {
    const dto = {
      studentId: studentFixture.id,
      amount: 45000,
      paymentMethod: 'CASH' as any,
      academicYear: '2024-2025',
      term: '1er Trimestre',
    };

    it('creates a payment and returns it', async () => {
      prisma.student.findFirst.mockResolvedValue(studentFixture);
      prisma.payment.count.mockResolvedValue(0);

      const createdPayment = {
        id: 'payment-001',
        ...dto,
        receiptNumber: 'REC-2025-00001',
        paymentDate: new Date(),
        institutionId: institutionFixture.id,
        recordedById: teacherUserFixture.id,
      };
      prisma.payment.create.mockResolvedValue(createdPayment);

      // For tryReleaseHeldNotifications — student is now PAID
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '45000' }]);
      prisma.notificationLog.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.record(dto, institutionFixture.id, teacherUserFixture.id);

      expect(result.receiptNumber).toBe('REC-2025-00001');
      expect(prisma.payment.create).toHaveBeenCalledTimes(1);
    });

    it('generates receipt number with year and sequence', async () => {
      prisma.student.findFirst.mockResolvedValue(studentFixture);
      prisma.payment.count.mockResolvedValue(4); // 4 previous payments
      prisma.payment.create.mockResolvedValue({ receiptNumber: 'REC-2025-00005' });
      prisma.studentFee.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.notificationLog.updateMany.mockResolvedValue({ count: 0 });

      await service.record(dto, institutionFixture.id, teacherUserFixture.id);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receiptNumber: expect.stringMatching(/^REC-\d{4}-00005$/),
          }),
        }),
      );
    });

    it('throws NotFoundException when student not found', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.record(dto, institutionFixture.id, teacherUserFixture.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getStudentPaymentStatus ─────────────────────────────────────────────

  describe('getStudentPaymentStatus', () => {
    beforeEach(() => {
      prisma.student.findFirst.mockResolvedValue(studentFixture);
    });

    it('returns PAID when totalPaid >= totalDue', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '45000' }]);

      const result = await service.getStudentPaymentStatus(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.status).toBe('PAID');
      expect(result.balance).toBe(0);
    });

    it('returns PARTIAL when some paid but not all', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '20000' }]);

      const result = await service.getStudentPaymentStatus(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.status).toBe('PARTIAL');
      expect(result.balance).toBe(25000);
    });

    it('returns UNPAID when nothing paid', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getStudentPaymentStatus(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.status).toBe('UNPAID');
      expect(result.balance).toBe(45000);
    });

    it('returns EXEMPT when student has exemption regardless of payments', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: true }]);
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getStudentPaymentStatus(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.status).toBe('EXEMPT');
    });

    it('returns PAID when no fees are assigned (totalDue === 0)', async () => {
      prisma.studentFee.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getStudentPaymentStatus(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.status).toBe('PAID');
    });
  });

  // ─── auto-release held notifications ─────────────────────────────────────

  describe('auto-release held notifications on full payment', () => {
    it('releases HELD_ notifications when payment completes the balance', async () => {
      prisma.student.findFirst.mockResolvedValue(studentFixture);
      prisma.payment.count.mockResolvedValue(0);
      prisma.payment.create.mockResolvedValue({ receiptNumber: 'REC-2025-00001' });

      // After payment: PAID
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '45000' }]);
      prisma.notificationLog.updateMany.mockResolvedValue({ count: 2 });

      await service.record(
        { studentId: studentFixture.id, amount: 45000, paymentMethod: 'CASH' as any, academicYear: '2024-2025' },
        institutionFixture.id,
        teacherUserFixture.id,
      );

      expect(prisma.notificationLog.updateMany).toHaveBeenCalledWith({
        where: {
          studentId: studentFixture.id,
          status: { in: ['HELD_UNPAID', 'HELD_PARTIAL'] },
        },
        data: { status: 'PENDING', heldReason: null },
      });
    });

    it('does NOT release notifications when balance is still outstanding', async () => {
      prisma.student.findFirst.mockResolvedValue(studentFixture);
      prisma.payment.count.mockResolvedValue(0);
      prisma.payment.create.mockResolvedValue({ receiptNumber: 'REC-2025-00001' });

      // After payment: still PARTIAL
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '20000' }]);

      await service.record(
        { studentId: studentFixture.id, amount: 20000, paymentMethod: 'CASH' as any, academicYear: '2024-2025' },
        institutionFixture.id,
        teacherUserFixture.id,
      );

      expect(prisma.notificationLog.updateMany).not.toHaveBeenCalled();
    });
  });
});
