import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotchpayService } from '../payments/notchpay.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SubmitMomoDto, InitiateNotchpayDto } from './dto/subscription.dto';

type Tier = 'STARTER' | 'BASIC' | 'PRO' | 'ENTERPRISE';
type BillingPeriod = 'MONTHLY' | 'ANNUAL';

const TIER_THRESHOLDS: Record<Tier, { min: number; max: number; label: string }> = {
  STARTER:    { min: 0,   max: 49,       label: '< 50 élèves' },
  BASIC:      { min: 50,  max: 99,       label: '50 – 99 élèves' },
  PRO:        { min: 100, max: 199,      label: '100 – 199 élèves' },
  ENTERPRISE: { min: 200, max: Infinity, label: '≥ 200 élèves' },
};

const BILLING_MONTHS: Record<BillingPeriod, number> = { MONTHLY: 1, ANNUAL: 12 };

function getTier(studentCount: number): Tier {
  if (studentCount < 50)  return 'STARTER';
  if (studentCount < 100) return 'BASIC';
  if (studentCount < 200) return 'PRO';
  return 'ENTERPRISE';
}

// Shorthand until `prisma migrate dev` generates the updated client types
const db = (prisma: PrismaService) => prisma as any;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  private readonly pricing: Record<Tier, { monthly: number; annual: number }>;
  private readonly ownerMomoNumber: string;
  private readonly ownerMomoOperator: string;
  private readonly trialDays: number;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notchpay: NotchpayService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {
    this.pricing = {
      STARTER: {
        monthly: +config.get('SUBSCRIPTION_STARTER_MONTHLY_XOF', 5000),
        annual:  +config.get('SUBSCRIPTION_STARTER_ANNUAL_XOF', 50000),
      },
      BASIC: {
        monthly: +config.get('SUBSCRIPTION_BASIC_MONTHLY_XOF', 10000),
        annual:  +config.get('SUBSCRIPTION_BASIC_ANNUAL_XOF', 100000),
      },
      PRO: {
        monthly: +config.get('SUBSCRIPTION_PRO_MONTHLY_XOF', 20000),
        annual:  +config.get('SUBSCRIPTION_PRO_ANNUAL_XOF', 200000),
      },
      ENTERPRISE: {
        monthly: +config.get('SUBSCRIPTION_ENTERPRISE_MONTHLY_XOF', 35000),
        annual:  +config.get('SUBSCRIPTION_ENTERPRISE_ANNUAL_XOF', 350000),
      },
    };
    this.ownerMomoNumber   = config.get<string>('OWNER_MOMO_NUMBER', '');
    this.ownerMomoOperator = config.get<string>('OWNER_MOMO_OPERATOR', 'TMoney');
    this.trialDays         = +config.get('SUBSCRIPTION_TRIAL_DAYS', 30);
    this.frontendUrl       = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  // ─── School-facing ────────────────────────────────────────────────────────

  async getStatus(institutionId: string) {
    const [institution, studentCount] = await Promise.all([
      db(this.prisma).institution.findUnique({
        where:  { id: institutionId },
        select: {
          subscriptionStatus: true,
          subscriptionExpiry: true,
          trialEndsAt:        true,
          subscriptionPlan:   true,
        },
      }),
      this.prisma.student.count({ where: { institutionId } }),
    ]);

    if (!institution) throw new NotFoundException('Institution not found');

    const now  = new Date();
    const tier = getTier(studentCount);

    // Auto-expire if deadline passed
    if (institution.subscriptionStatus === 'TRIAL' && institution.trialEndsAt && institution.trialEndsAt < now) {
      await db(this.prisma).institution.update({
        where: { id: institutionId },
        data:  { subscriptionStatus: 'EXPIRED' },
      });
      institution.subscriptionStatus = 'EXPIRED';
    }
    if (institution.subscriptionStatus === 'ACTIVE' && institution.subscriptionExpiry && institution.subscriptionExpiry < now) {
      await db(this.prisma).institution.update({
        where: { id: institutionId },
        data:  { subscriptionStatus: 'EXPIRED' },
      });
      institution.subscriptionStatus = 'EXPIRED';
    }

    const deadline = institution.subscriptionExpiry ?? institution.trialEndsAt;
    const daysLeft = deadline
      ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000))
      : null;

    return {
      status:       institution.subscriptionStatus,
      tier,
      studentCount,
      billingPlan:  institution.subscriptionPlan, // last paid billing period
      expiry:       institution.subscriptionExpiry,
      trialEndsAt:  institution.trialEndsAt,
      daysLeft,
      currentPrice: this.pricing[tier],
      pricing: Object.fromEntries(
        (Object.keys(TIER_THRESHOLDS) as Tier[]).map((t) => [
          t,
          { ...this.pricing[t], ...TIER_THRESHOLDS[t] },
        ]),
      ),
      momoInfo: {
        number:   this.ownerMomoNumber,
        operator: this.ownerMomoOperator,
      },
    };
  }

  /** School initiates Notchpay payment → returns checkout URL */
  async initiateNotchpay(institutionId: string, dto: InitiateNotchpayDto, adminEmail: string, adminName: string) {
    const studentCount = await this.prisma.student.count({ where: { institutionId } });
    const tier   = getTier(studentCount);
    const amount = dto.plan === 'ANNUAL' ? this.pricing[tier].annual : this.pricing[tier].monthly;

    const { url, reference } = await this.notchpay.createTransaction({
      studentId:    institutionId,
      institutionId,
      academicYear: new Date().getFullYear().toString(),
      amount,
      parentName:   adminName,
      parentEmail:  adminEmail,
      description:  `Abonnement NovaBulletin — ${tier} (${dto.plan === 'ANNUAL' ? 'Annuel' : 'Mensuel'})`,
    });

    await db(this.prisma).subscriptionPayment.create({
      data: {
        institutionId,
        plan:          dto.plan,
        tier,
        amount,
        method:        'NOTCHPAY',
        status:        'PENDING_REVIEW',
        notchpayRef:   reference,
        notchpayUrl:   url,
        monthsGranted: BILLING_MONTHS[dto.plan as BillingPeriod],
      },
    });

    this.logger.log(`Notchpay subscription initiated for ${institutionId} (tier=${tier}): ${reference}`);
    return { url, reference };
  }

  /** School submits manual MoMo proof */
  async submitMomo(institutionId: string, dto: SubmitMomoDto) {
    const studentCount = await this.prisma.student.count({ where: { institutionId } });
    const tier   = getTier(studentCount);
    const amount = dto.plan === 'ANNUAL' ? this.pricing[tier].annual : this.pricing[tier].monthly;

    const payment = await db(this.prisma).subscriptionPayment.create({
      data: {
        institutionId,
        plan:          dto.plan,
        tier,
        amount,
        method:         'MOMO_MANUAL',
        status:         'PENDING_REVIEW',
        momoPhone:      dto.momoPhone,
        momoReference:  dto.momoReference,
        momoOperator:   dto.momoOperator,
        monthsGranted:  BILLING_MONTHS[dto.plan as BillingPeriod],
      },
      include: { institution: { select: { name: true } } },
    });

    if (this.ownerMomoNumber) {
      await this.whatsapp.sendSchoolRegistration(
        `💳 Paiement abonnement soumis\nÉcole: ${payment.institution.name}\nTier: ${tier} (${studentCount} élèves)\nPlan: ${dto.plan}\nMontant: ${amount} XOF\nOpérateur: ${dto.momoOperator}\nRéf: ${dto.momoReference}\n→ Vérifiez et approuvez dans le tableau superadmin.`,
        '',
      );
    }

    this.logger.log(`MoMo subscription submitted for ${institutionId} (tier=${tier}), ref: ${dto.momoReference}`);
    return { id: payment.id, message: 'Votre paiement est en cours de vérification. Vous recevrez une confirmation dans les 24h.' };
  }

  // ─── Notchpay webhook ─────────────────────────────────────────────────────

  async handleWebhook(rawBody: string, signature: string, payload: any) {
    const valid = this.notchpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) throw new BadRequestException('Invalid webhook signature');

    const reference = payload?.transaction?.reference ?? payload?.reference;
    const status    = payload?.transaction?.status ?? payload?.status;

    if (!reference) return { received: true };
    if (status !== 'complete') return { received: true };

    const subPayment = await db(this.prisma).subscriptionPayment.findUnique({
      where: { notchpayRef: reference },
    });

    if (!subPayment || subPayment.status === 'APPROVED') return { received: true };

    await this.approve(subPayment.id, 'webhook');
    return { received: true };
  }

  // ─── Superadmin ───────────────────────────────────────────────────────────

  async getPending() {
    return db(this.prisma).subscriptionPayment.findMany({
      where:   { status: 'PENDING_REVIEW' },
      include: { institution: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAllPayments() {
    return db(this.prisma).subscriptionPayment.findMany({
      include: { institution: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take:    100,
    });
  }

  async approve(paymentId: string, approvedById: string) {
    const payment = await db(this.prisma).subscriptionPayment.findUnique({
      where:   { id: paymentId },
      include: {
        institution: {
          select: {
            id: true, name: true, email: true,
            subscriptionExpiry: true, subscriptionStatus: true,
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'APPROVED') throw new BadRequestException('Already approved');

    const now  = new Date();
    const base = payment.institution.subscriptionStatus === 'ACTIVE'
      && payment.institution.subscriptionExpiry
      && payment.institution.subscriptionExpiry > now
        ? payment.institution.subscriptionExpiry
        : now;

    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + payment.monthsGranted);

    await this.prisma.$transaction([
      db(this.prisma).subscriptionPayment.update({
        where: { id: paymentId },
        data:  { status: 'APPROVED', approvedById, approvedAt: now },
      }),
      db(this.prisma).institution.update({
        where: { id: payment.institutionId },
        data:  {
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiry: newExpiry,
          subscriptionPlan:   payment.plan, // billing period (MONTHLY/ANNUAL)
        },
      }),
    ]);

    if (payment.institution.email) {
      await this.mail.sendSubscriptionConfirmation(
        payment.institution.name,
        payment.institution.email,
        `${payment.tier ?? ''} ${payment.plan}`.trim(),
        newExpiry,
      );
    }

    this.logger.log(`Subscription approved for ${payment.institution.name} (tier=${payment.tier}), expiry: ${newExpiry.toISOString()}`);
    return { success: true, newExpiry };
  }

  async reject(paymentId: string, rejectedById: string, reason?: string) {
    const payment = await db(this.prisma).subscriptionPayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    await db(this.prisma).subscriptionPayment.update({
      where: { id: paymentId },
      data:  { status: 'REJECTED', approvedById: rejectedById, approvedAt: new Date(), rejectedReason: reason },
    });

    return { success: true };
  }

  async getPaymentHistory(institutionId: string) {
    return db(this.prisma).subscriptionPayment.findMany({
      where:   { institutionId },
      orderBy: { createdAt: 'desc' },
      take:    20,
    });
  }

  /** Called when a school is approved — starts the 30-day trial */
  async startTrial(institutionId: string) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + this.trialDays);

    await db(this.prisma).institution.update({
      where: { id: institutionId },
      data:  { subscriptionStatus: 'TRIAL', trialEndsAt },
    });
  }
}
