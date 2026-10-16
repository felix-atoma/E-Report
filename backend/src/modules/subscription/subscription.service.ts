import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotchpayService } from '../payments/notchpay.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SubmitMomoDto, InitiateNotchpayDto } from './dto/subscription.dto';

/** Deux tailles d'école (valeurs de l'enum SubscriptionTier) : moins de 200 élèves, 200 et plus. */
type Tier = 'BASIC' | 'ENTERPRISE';
type BillingPeriod = 'TRIMESTER' | 'SEMESTER';

const TIER_THRESHOLDS: Record<Tier, { min: number; max: number; label: string }> = {
  BASIC:      { min: 0,   max: 199,      label: '< 200 élèves' },
  ENTERPRISE: { min: 200, max: Infinity, label: '≥ 200 élèves' },
};

/** Durée couverte : 3 trimestres ou 2 semestres font l'année (vacances comprises). */
const BILLING_MONTHS: Record<BillingPeriod, number> = { TRIMESTER: 4, SEMESTER: 6 };
const PERIOD_LABEL: Record<string, string> = { TRIMESTER: 'Trimestre', SEMESTER: 'Semestre', MONTHLY: 'Mensuel', ANNUAL: 'Annuel' };

function getTier(studentCount: number): Tier {
  return studentCount < 200 ? 'BASIC' : 'ENTERPRISE';
}

// Shorthand until `prisma migrate dev` generates the updated client types
const db = (prisma: PrismaService) => prisma as any;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  /** onboarding = frais uniques d'entrée dans la base, ajoutés au premier paiement. */
  private readonly pricing: Record<Tier, { onboarding: number; trimester: number; semester: number }>;
  private readonly ownerMomoNumber: string;
  private readonly ownerMomoOperator: string;
  private readonly trialDays: number;
  private readonly frontendUrl: string;
  /** Platform's own Notchpay account — collects subscription fees FROM schools (distinct from a school's own account, used for fee collection FROM parents). */
  private readonly platformNotchpayPublicKey: string;
  private readonly platformNotchpayHashKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notchpay: NotchpayService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {
    this.pricing = {
      BASIC: {
        onboarding: +config.get('SUBSCRIPTION_BASIC_ONBOARDING_XOF', 20000),
        trimester:  +config.get('SUBSCRIPTION_BASIC_TRIMESTER_XOF', 75000),
        semester:   +config.get('SUBSCRIPTION_BASIC_SEMESTER_XOF', 100000),
      },
      ENTERPRISE: {
        onboarding: +config.get('SUBSCRIPTION_ENTERPRISE_ONBOARDING_XOF', 40000),
        trimester:  +config.get('SUBSCRIPTION_ENTERPRISE_TRIMESTER_XOF', 150000),
        semester:   +config.get('SUBSCRIPTION_ENTERPRISE_SEMESTER_XOF', 200000),
      },
    };
    this.ownerMomoNumber   = config.get<string>('OWNER_MOMO_NUMBER', '');
    this.ownerMomoOperator = config.get<string>('OWNER_MOMO_OPERATOR', 'TMoney');
    this.trialDays         = +config.get('SUBSCRIPTION_TRIAL_DAYS', 30);
    this.frontendUrl       = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    this.platformNotchpayPublicKey = config.get<string>('PLATFORM_NOTCHPAY_PUBLIC_KEY', '');
    this.platformNotchpayHashKey   = config.get<string>('PLATFORM_NOTCHPAY_HASH_KEY', '');
  }

  // ─── School-facing ────────────────────────────────────────────────────────

  /** Les frais d'inscription ne sont dus qu'une fois : tant qu'aucun paiement n'a été approuvé. */
  private async onboardingDue(institutionId: string): Promise<boolean> {
    const paid = await db(this.prisma).subscriptionPayment.count({ where: { institutionId, status: 'APPROVED' } });
    return paid === 0;
  }

  /** Montant à payer pour une période, frais d'inscription compris s'ils sont encore dus. */
  private async quote(institutionId: string, plan: BillingPeriod) {
    if (!BILLING_MONTHS[plan]) throw new BadRequestException('Période de facturation invalide.');
    const studentCount = await this.prisma.student.count({ where: { institutionId } });
    const tier = getTier(studentCount);
    const price = this.pricing[tier];
    const onboarding = (await this.onboardingDue(institutionId)) ? price.onboarding : 0;
    const period = plan === 'SEMESTER' ? price.semester : price.trimester;
    return { tier, studentCount, onboarding, amount: period + onboarding };
  }

  async getStatus(institutionId: string) {
    const [institution, studentCount, onboardingDue] = await Promise.all([
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
      this.onboardingDue(institutionId),
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
      onboardingDue,
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
    if (!this.platformNotchpayPublicKey) {
      throw new BadRequestException("Le paiement en ligne de l'abonnement n'est pas configuré.");
    }

    const { tier, studentCount, onboarding, amount } = await this.quote(institutionId, dto.plan);

    const { url, reference } = await this.notchpay.createTransaction(this.platformNotchpayPublicKey, {
      studentId:    institutionId,
      institutionId,
      academicYear: new Date().getFullYear().toString(),
      amount,
      parentName:   adminName,
      parentEmail:  adminEmail,
      description:  `Abonnement NovaBulletin — ${PERIOD_LABEL[dto.plan]}${onboarding ? " + frais d'inscription" : ''} (${TIER_THRESHOLDS[tier].label})`,
      callbackPath: '/subscription-return',
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
    const { tier, studentCount, onboarding, amount } = await this.quote(institutionId, dto.plan);

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
        `💳 Paiement abonnement soumis\nÉcole: ${payment.institution.name}\nTier: ${tier} (${studentCount} élèves)\nPlan: ${PERIOD_LABEL[dto.plan]}${onboarding ? ` + inscription ${onboarding} XOF` : ''}\nMontant: ${amount} XOF\nOpérateur: ${dto.momoOperator}\nRéf: ${dto.momoReference}\n→ Vérifiez et approuvez dans le tableau superadmin.`,
        '',
      );
    }

    this.logger.log(`MoMo subscription submitted for ${institutionId} (tier=${tier}), ref: ${dto.momoReference}`);
    return { id: payment.id, message: 'Votre paiement est en cours de vérification. Vous recevrez une confirmation dans les 24h.' };
  }

  // ─── Notchpay webhook ─────────────────────────────────────────────────────

  async handleWebhook(rawBody: string, signature: string, payload: any) {
    const valid = this.notchpay.verifyWebhookSignature(rawBody, signature, this.platformNotchpayHashKey);
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
          subscriptionPlan:   payment.plan, // billing period (TRIMESTER/SEMESTER)
        },
      }),
    ]);

    if (payment.institution.email) {
      await this.mail.sendSubscriptionConfirmation(
        payment.institution.name,
        payment.institution.email,
        payment.plan,
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
