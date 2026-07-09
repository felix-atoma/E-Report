import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const db = (prisma: PrismaService) => prisma as any;

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Runs daily at 07:00 Lomé time. Handles full subscription lifecycle. */
  @Cron('0 7 * * *', { name: 'subscription-lifecycle', timeZone: 'Africa/Lome' })
  async handleSubscriptionLifecycle() {
    this.logger.log('Running subscription lifecycle cron…');

    const now = new Date();
    const in7  = new Date(now.getTime() + 7 * 86_400_000);
    const in8  = new Date(now.getTime() + 8 * 86_400_000);
    const in1  = new Date(now.getTime() + 1 * 86_400_000);
    const in2  = new Date(now.getTime() + 2 * 86_400_000);

    await Promise.all([
      this._expireTrials(now),
      this._expireActiveSubscriptions(now),
      this._warn(7, in7, in8),
      this._warn(1, in1, in2),
    ]);

    this.logger.log('Subscription lifecycle cron complete.');
  }

  // ── Expire trials whose trialEndsAt has passed ───────────────────────────
  private async _expireTrials(now: Date) {
    const expired = await db(this.prisma).institution.findMany({
      where: { subscriptionStatus: 'TRIAL', trialEndsAt: { lt: now } },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { name: true, email: true },
          take: 1,
        },
        _count: { select: { students: true } },
      },
    });

    let count = 0;
    for (const inst of expired) {
      // Schools < 50 students are permanently free — never expire them
      if (inst._count.students < 50) continue;

      await db(this.prisma).institution.update({
        where: { id: inst.id },
        data: { subscriptionStatus: 'EXPIRED' },
      });
      count++;

      const admin = inst.users[0];
      if (admin?.email) {
        await this.mail
          .sendTrialExpiredNotice(admin.name ?? inst.name, admin.email, inst.name)
          .catch((e) => this.logger.error(`Trial-expired email failed for ${inst.id}`, e));
      }
    }

    if (count > 0) this.logger.log(`Expired ${count} trial(s).`);
  }

  // ── Expire active subscriptions whose subscriptionExpiry has passed ───────
  private async _expireActiveSubscriptions(now: Date) {
    const { count } = await db(this.prisma).institution.updateMany({
      where: { subscriptionStatus: 'ACTIVE', subscriptionExpiry: { lt: now } },
      data: { subscriptionStatus: 'EXPIRED' },
    });
    if (count > 0) this.logger.log(`Expired ${count} active subscription(s).`);
  }

  // ── Send warning emails to schools expiring in [windowStart, windowEnd) ──
  private async _warn(daysLeft: number, windowStart: Date, windowEnd: Date) {
    const expiring = await db(this.prisma).institution.findMany({
      where: {
        subscriptionStatus: 'TRIAL',
        trialEndsAt: { gte: windowStart, lt: windowEnd },
      },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { name: true, email: true },
          take: 1,
        },
        _count: { select: { students: true } },
      },
    });

    let count = 0;
    for (const inst of expiring) {
      if (inst._count.students < 50) continue; // free tier, no warning needed

      const admin = inst.users[0];
      if (admin?.email) {
        await this.mail
          .sendTrialExpiryWarning(admin.name ?? inst.name, admin.email, inst.name, daysLeft)
          .catch((e) => this.logger.error(`Trial-warning email failed for ${inst.id}`, e));
        count++;
      }
    }

    if (count > 0) this.logger.log(`Sent ${daysLeft}-day expiry warnings to ${count} school(s).`);
  }
}
