import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MailService } from '../../src/modules/mail/mail.service';
import { WhatsAppService } from '../../src/modules/whatsapp/whatsapp.service';
import { createPrismaMock, PrismaMock } from '../helpers/prisma-mock.helper';
import {
  studentFixture,
  parentUserFixture,
  reportCardFixture,
  institutionFixture,
} from '../fixtures/institution.fixture';

describe('NotificationsService — fee-gate logic', () => {
  let service: NotificationsService;
  let prisma: PrismaMock;
  let mail: { sendBulletinReady: jest.Mock };
  let whatsapp: { sendBulletinReady: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    mail = { sendBulletinReady: jest.fn().mockResolvedValue(true) };
    whatsapp = { sendBulletinReady: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: WhatsAppService, useValue: whatsapp },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ─── handleReportPublished ───────────────────────────────────────────────

  describe('handleReportPublished', () => {
    const baseReport = {
      ...reportCardFixture,
      studentId: studentFixture.id,
      academicYear: '2024-2025',
      student: { parent: { id: parentUserFixture.id } },
    };

    it('creates IN_APP + WHATSAPP + EMAIL as PENDING when student is PAID', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '45000' }]);
      prisma.notificationLog.createMany.mockResolvedValue({ count: 3 });

      await service.handleReportPublished({ report: baseReport, institutionId: institutionFixture.id });

      expect(prisma.notificationLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ channel: 'IN_APP', status: 'PENDING' }),
          expect.objectContaining({ channel: 'WHATSAPP', status: 'PENDING' }),
          expect.objectContaining({ channel: 'EMAIL', status: 'PENDING' }),
        ]),
      });
    });

    it('creates only IN_APP as PENDING and WHATSAPP/EMAIL as HELD_UNPAID when student is UNPAID', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.notificationLog.createMany.mockResolvedValue({ count: 1 });

      await service.handleReportPublished({ report: baseReport, institutionId: institutionFixture.id });

      expect(prisma.notificationLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ channel: 'IN_APP', status: 'PENDING' }),
        ]),
      });

      // Should NOT have WHATSAPP or EMAIL in PENDING
      const callArg = prisma.notificationLog.createMany.mock.calls[0][0];
      const pendingChannels = callArg.data
        .filter((d: any) => d.status === 'PENDING')
        .map((d: any) => d.channel);
      expect(pendingChannels).not.toContain('WHATSAPP');
      expect(pendingChannels).not.toContain('EMAIL');
    });

    it('sets HELD_PARTIAL when student has partial payment', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([{ amount: '20000' }]);
      prisma.notificationLog.createMany.mockResolvedValue({ count: 1 });

      await service.handleReportPublished({ report: baseReport, institutionId: institutionFixture.id });

      const callArg = prisma.notificationLog.createMany.mock.calls[0][0];
      const heldEntries = callArg.data.filter((d: any) => d.status === 'HELD_PARTIAL');
      expect(heldEntries.length).toBeGreaterThan(0);
    });

    it('sends all channels as PENDING for EXEMPT students (scholarship)', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: true }]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.notificationLog.createMany.mockResolvedValue({ count: 3 });

      await service.handleReportPublished({ report: baseReport, institutionId: institutionFixture.id });

      const callArg = prisma.notificationLog.createMany.mock.calls[0][0];
      const allPending = callArg.data.every((d: any) => d.status === 'PENDING');
      expect(allPending).toBe(true);
    });

    it('does nothing when student has no parent linked', async () => {
      const reportWithNoParent = { ...baseReport, student: { parent: null } };

      await service.handleReportPublished({ report: reportWithNoParent, institutionId: institutionFixture.id });

      expect(prisma.notificationLog.createMany).not.toHaveBeenCalled();
    });

    it('includes heldReason message for HELD_UNPAID entries', async () => {
      prisma.studentFee.findMany.mockResolvedValue([{ amountDue: '45000', isExempt: false }]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.notificationLog.createMany.mockResolvedValue({ count: 1 });

      await service.handleReportPublished({ report: baseReport, institutionId: institutionFixture.id });

      const callArg = prisma.notificationLog.createMany.mock.calls[0][0];
      const heldEntry = callArg.data.find((d: any) => d.status === 'HELD_UNPAID');
      expect(heldEntry?.heldReason).toContain('retenu');
    });
  });

  // ─── forceSend ───────────────────────────────────────────────────────────

  describe('forceSend', () => {
    it('updates status to PENDING regardless of previous hold reason', async () => {
      prisma.notificationLog.findFirst.mockResolvedValue({
        id: 'notif-001',
        status: 'HELD_UNPAID',
        heldReason: 'pas payé',
        student: { institutionId: institutionFixture.id },
      });
      prisma.notificationLog.update.mockResolvedValue({ id: 'notif-001', status: 'PENDING' });

      const result = await service.forceSend('notif-001', institutionFixture.id);

      expect(prisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'notif-001' },
        data: { status: 'PENDING', heldReason: null },
      });
    });
  });
});
