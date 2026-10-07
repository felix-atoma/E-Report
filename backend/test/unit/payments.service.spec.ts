import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotchpayService } from '../../src/modules/payments/notchpay.service';
import { CinetpayService } from '../../src/modules/payments/cinetpay.service';
import { PdfService } from '../../src/modules/pdf/pdf.service';
import { PaymentReceiptNotifier } from '../../src/modules/payments/payment-receipt-notifier.service';
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
        { provide: CinetpayService, useValue: {} },
        { provide: PdfService, useValue: { generateFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf')) } },
        { provide: PaymentReceiptNotifier, useValue: { notify: jest.fn() } },
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
            // School prefix: receipt numbers are unique across all schools
            receiptNumber: expect.stringMatching(/^REC-\d{4}-[0-9A-Z]{4}-00005$/),
          }),
        }),
      );
    });

    it('uses a different prefix per school so two schools never collide', async () => {
      prisma.student.findFirst.mockResolvedValue(studentFixture);
      prisma.payment.count.mockResolvedValue(0);
      prisma.payment.create.mockResolvedValue({ id: 'p' });
      prisma.studentFee.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);

      await service.record(dto, 'aaaa1111-0000-0000-0000-000000000000', teacherUserFixture.id);
      await service.record(dto, 'bbbb2222-0000-0000-0000-000000000000', teacherUserFixture.id);

      const [a, b] = prisma.payment.create.mock.calls.map((c: any[]) => c[0].data.receiptNumber);
      expect(a).not.toBe(b);
    });

    it('retries with the next number when two payments are recorded at the same moment', async () => {
      prisma.student.findFirst.mockResolvedValue(studentFixture);
      prisma.payment.count.mockResolvedValue(0);
      prisma.payment.create
        .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002', meta: { target: ['receiptNumber'] } }))
        .mockResolvedValueOnce({ id: 'p' });
      prisma.studentFee.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);

      await service.record(dto, institutionFixture.id, teacherUserFixture.id);

      const numbers = prisma.payment.create.mock.calls.map((c: any[]) => c[0].data.receiptNumber);
      expect(numbers[0]).toMatch(/-00001$/);
      expect(numbers[1]).toMatch(/-00002$/);
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

    it('one exempted fee does not make the whole account EXEMPT; exempted amount is not owed', async () => {
      prisma.studentFee.findMany.mockResolvedValue([
        { amountDue: '10000', isExempt: true },
        { amountDue: '45000', isExempt: false },
      ]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '5000' }]);

      const result = await service.getStudentPaymentStatus(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.status).toBe('PARTIAL');
      expect(result.totalDue).toBe(45000);
      expect(result.balance).toBe(40000);
    });

    it('returns PAID when no fees are assigned (totalDue === 0)', async () => {
      prisma.studentFee.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getStudentPaymentStatus(studentFixture.id, institutionFixture.id, '2024-2025');

      expect(result.status).toBe('PAID');
    });
  });

  // ─── receipt access ──────────────────────────────────────────────────────

  describe('generateReceipt', () => {
    it('limits a parent to receipts of their own children', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.generateReceipt('pay-1', institutionFixture.id, { id: 'parent-1', role: 'PARENT' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1', institutionId: institutionFixture.id, student: { parentId: 'parent-1' } },
        }),
      );
    });

    it('escapes text typed by staff in the receipt HTML', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        amount: 1000, paymentDate: new Date(), receiptNumber: 'R1', academicYear: '2026-2027', term: null,
        paymentMethod: 'MOBILE_MONEY_FLOOZ', referenceNumber: null, notes: '<img src=x onerror=alert(1)>',
        student: { admissionNumber: 'M1', user: { name: 'Ama' }, classes: [] },
        institution: { name: 'École', address: null, phone: null, logo: null },
        recordedBy: { name: 'Caisse' },
      });
      const pdf = (service as any).pdf;

      await service.generateReceipt('pay-1', institutionFixture.id, { id: 'admin', role: 'ADMIN' });

      const html: string = pdf.generateFromHtml.mock.calls[0][0];
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x');
      expect(html).toContain('Mobile Money (Flooz)');
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
