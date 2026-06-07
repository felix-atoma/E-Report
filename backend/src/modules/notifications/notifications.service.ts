import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private dispatching = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  async findForUser(userId: string) {
    return this.prisma.notificationLog.findMany({
      where: { recipientUserId: userId },
      include: {
        reportCard: {
          select: { id: true, termName: true, academicYear: true, overallAverage: true },
        },
        student: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notificationLog.count({
      where: { recipientUserId: userId, isRead: false },
    });
    return { count };
  }

  async markAllRead(userId: string) {
    await this.prisma.notificationLog.updateMany({
      where: { recipientUserId: userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notificationLog.updateMany({
      where: { id, recipientUserId: userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async findHeld(institutionId: string) {
    return this.prisma.notificationLog.findMany({
      where: {
        status: { in: ['HELD_UNPAID', 'HELD_PARTIAL'] },
        student: { institutionId },
      },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            parent: { select: { name: true, whatsappNumber: true } },
          },
        },
        reportCard: { select: { id: true, termName: true, academicYear: true } },
        recipient: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async forceSend(id: string, institutionId: string) {
    const log = await this.prisma.notificationLog.findFirst({
      where: { id, student: { institutionId } },
    });
    if (!log) throw new NotFoundException('Notification not found');

    return this.prisma.notificationLog.update({
      where: { id },
      data: { status: 'PENDING', heldReason: null },
    });
  }

  // ─── Event: report published ──────────────────────────────────────────────

  @OnEvent('report.published')
  async handleReportPublished(payload: { report: any; institutionId: string }) {
    const { report } = payload;
    const parentId = report.student?.parent?.id;
    if (!parentId) return;

    const [studentFees, payments] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { studentId: report.studentId, academicYear: report.academicYear },
      }),
      this.prisma.payment.findMany({
        where: { studentId: report.studentId, academicYear: report.academicYear },
        select: { amount: true },
      }),
    ]);

    const totalDue = studentFees.reduce((s, f) => s + Number(f.amountDue), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const hasExemption = studentFees.some((f) => f.isExempt);

    const paymentStatus =
      hasExemption ? 'EXEMPT' :
      totalDue === 0 ? 'PAID' :
      totalPaid >= totalDue ? 'PAID' :
      totalPaid > 0 ? 'PARTIAL' : 'UNPAID';

    const deliveryReady = paymentStatus === 'PAID' || paymentStatus === 'EXEMPT';
    const heldStatus = paymentStatus === 'PARTIAL' ? 'HELD_PARTIAL' : 'HELD_UNPAID';
    const heldReason = paymentStatus === 'PARTIAL'
      ? 'Bulletin retenu — paiement partiel'
      : 'Bulletin retenu — aucun paiement enregistré';

    const channels: Array<'WHATSAPP' | 'EMAIL' | 'IN_APP'> = ['IN_APP', 'WHATSAPP', 'EMAIL'];

    await this.prisma.notificationLog.createMany({
      data: channels.map((channel) => ({
        reportCardId: report.id,
        studentId: report.studentId,
        recipientUserId: parentId,
        channel,
        status: deliveryReady || channel === 'IN_APP' ? 'PENDING' : heldStatus,
        heldReason: !deliveryReady && channel !== 'IN_APP' ? heldReason : null,
      })),
    });
  }

  // ─── Cron: dispatch PENDING notifications every 5 minutes ────────────────

  @Cron('*/5 * * * *')
  async dispatchPendingNotifications() {
    if (this.dispatching) {
      this.logger.warn('Dispatch already in progress — skipping this tick');
      return;
    }
    this.dispatching = true;
    try {
      await this._dispatch();
    } finally {
      this.dispatching = false;
    }
  }

  private async _dispatch() {
    const now = new Date();
    const pending = await this.prisma.notificationLog.findMany({
      where: { status: 'PENDING', channel: { in: ['WHATSAPP', 'EMAIL'] } },
      include: {
        reportCard: {
          select: {
            id: true, termName: true, academicYear: true,
            overallAverage: true, mention: true, pdfUrl: true,
          },
        },
        student: {
          include: {
            user: { select: { name: true } },
            institution: { select: { name: true } },
          },
        },
        recipient: {
          select: { email: true, whatsappNumber: true, name: true },
        },
      },
      take: 50,
    });

    if (pending.length === 0) return;

    this.logger.log(`Dispatching ${pending.length} pending notifications`);

    // Mark all as in-flight in one query
    await this.prisma.notificationLog.updateMany({
      where: { id: { in: pending.map((l) => l.id) } },
      data: { attemptCount: { increment: 1 }, lastAttemptAt: now },
    });

    const sentIds: string[] = [];
    const failedIds: string[] = [];

    for (const log of pending) {
      const studentName = log.student?.user?.name ?? 'Élève';
      const institutionName = (log.student as any)?.institution?.name ?? 'NovaBulletin';
      const average = log.reportCard?.overallAverage != null
        ? log.reportCard.overallAverage.toFixed(2).replace('.', ',')
        : '—';
      const mention = log.reportCard?.mention ?? '—';
      const termName = log.reportCard?.termName ?? '';
      const academicYear = log.reportCard?.academicYear ?? '';
      const pdfUrl = log.reportCard?.pdfUrl ?? null;

      let success = false;
      try {
        if (log.channel === 'EMAIL' && log.recipient.email) {
          success = await this.mail.sendBulletinReady({
            to: log.recipient.email, studentName, termName,
            academicYear, average, mention, pdfUrl, institutionName,
          });
        } else if (log.channel === 'WHATSAPP' && log.recipient.whatsappNumber) {
          success = await this.whatsapp.sendBulletinReady({
            toPhone: log.recipient.whatsappNumber, studentName, termName,
            academicYear, average, mention, pdfUrl, institutionName,
          });
        }
      } catch (err) {
        this.logger.error(`Dispatch error for notification ${log.id}`, err);
      }

      (success ? sentIds : failedIds).push(log.id);
    }

    // Two bulk updates instead of 50 individual ones
    const deliveredAt = new Date();
    await Promise.all([
      sentIds.length > 0 && this.prisma.notificationLog.updateMany({
        where: { id: { in: sentIds } },
        data: { status: 'SENT', deliveredAt },
      }),
      failedIds.length > 0 && this.prisma.notificationLog.updateMany({
        where: { id: { in: failedIds } },
        data: { status: 'FAILED', errorMessage: 'Delivery attempt failed' },
      }),
    ]);

    this.logger.log(`Done — sent: ${sentIds.length}, failed: ${failedIds.length}`);
  }
}
