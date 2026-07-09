import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { RegisterInstitutionDto } from './dto/register-institution.dto';
import { Role } from '../../common/enums/role.enum';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly subscription: SubscriptionService,
  ) {}

  // ─── Public: Register a new school (immediately ACTIVE) ─────────────────────
  async registerInstitution(dto: RegisterInstitutionDto) {
    const email = dto.adminEmail.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(
        'Un compte avec cet email existe déjà. Contactez le support si vous avez perdu vos accès.',
      );
    }

    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashedPassword = await bcrypt.hash(dto.password, Number(saltRounds));

    const institution = await this.prisma.institution.create({
      data: {
        name: dto.schoolName,
        address: dto.city,
        isActive: true,
        status: 'ACTIVE' as any,
        declaredStudentCount: dto.declaredStudentCount ?? null,
      },
    });

    await this.prisma.user.create({
      data: {
        name: dto.adminName,
        email,
        password: hashedPassword,
        role: Role.ADMIN as any,
        isActive: true,
        institutionId: institution.id,
      },
    });

    // Start 30-day trial immediately (free if < 50 real students, trial applies above)
    this.subscription.startTrial(institution.id).catch((e) =>
      this.logger.error('startTrial failed', e),
    );

    // Send welcome email to the new admin
    this.mail
      .sendSchoolApproval(dto.adminName, email, dto.schoolName)
      .catch((e) => this.logger.error('Welcome email failed', e));

    // Notify platform owner (informational)
    this.whatsapp
      .sendSchoolRegistration(dto.schoolName, dto.city)
      .catch((e) => this.logger.error('WhatsApp notification failed', e));

    // Real-time alert to any connected superadmin dashboards
    this.eventEmitter.emit('school.registered', {
      id:           institution.id,
      name:         institution.name,
      city:         institution.address ?? dto.city,
      adminName:    dto.adminName,
      adminEmail:   email,
      studentCount: dto.declaredStudentCount ?? 0,
      registeredAt: institution.createdAt.toISOString(),
    });

    return {
      message: 'Compte créé avec succès. Vous pouvez vous connecter dès maintenant.',
    };
  }

  // ─── SuperAdmin: List all institutions with full data ───────────────────────
  async listInstitutions() {
    const institutions = await this.prisma.institution.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            students: true,
            users: true,
            classes: true,
            bulletins: true,
            payments: true,
          },
        },
        users: {
          where: { role: Role.ADMIN as any },
          select: {
            id: true,
            name: true,
            email: true,
            whatsappNumber: true,
            isActive: true,
            createdAt: true,
          },
          take: 1,
        },
      },
    });

    return institutions.map((inst) => {
      const admin = inst.users[0] ?? null;
      const bs = (inst.brandingSettings as Record<string, unknown>) ?? {};
      return {
        id: inst.id,
        name: inst.name,
        city: inst.address,
        country: inst.country,
        website: inst.website,
        motto: inst.motto,
        logo: inst.logo,
        circonscription: bs.circonscription ?? null,
        email: inst.email,
        phone: inst.phone,
        status: inst.status,
        isActive: inst.isActive,
        declaredStudentCount: inst.declaredStudentCount,
        actualStudentCount: inst._count.students,
        classCount: inst._count.classes,
        userCount: inst._count.users,
        bulletinCount: inst._count.bulletins,
        paymentCount: inst._count.payments,
        subscriptionPlan: inst.subscriptionPlan,
        ownerNotes: inst.ownerNotes,
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
        admin: admin
          ? {
              id: admin.id,
              name: admin.name,
              email: admin.email,
              whatsappNumber: admin.whatsappNumber,
              isActive: admin.isActive,
              createdAt: admin.createdAt,
            }
          : null,
      };
    });
  }

  // ─── SuperAdmin: Approve an institution ─────────────────────────────────────
  async approveInstitution(id: string) {
    const institution = await this.findInstitutionOrThrow(id);

    const [updated] = await this.prisma.$transaction([
      this.prisma.institution.update({
        where: { id },
        data: { status: 'ACTIVE' as any, isActive: true },
      }),
      this.prisma.user.updateMany({
        where: { institutionId: id, role: Role.ADMIN as any },
        data: { isActive: true },
      }),
    ]);

    // Send activation email to admin(s)
    const admins = await this.prisma.user.findMany({
      where: { institutionId: id, role: Role.ADMIN as any },
      select: { name: true, email: true },
    });
    for (const admin of admins) {
      this.mail
        .sendSchoolApproval(admin.name, admin.email, institution.name)
        .catch((e) => this.logger.error('Approval email failed', e));
    }

    return updated;
  }

  // ─── SuperAdmin: Suspend an institution ─────────────────────────────────────
  async suspendInstitution(id: string) {
    await this.findInstitutionOrThrow(id);
    return this.prisma.institution.update({
      where: { id },
      data: { status: 'SUSPENDED' as any, isActive: false },
    });
  }

  // ─── SuperAdmin: Reject an institution ──────────────────────────────────────
  async rejectInstitution(id: string) {
    await this.findInstitutionOrThrow(id);
    return this.prisma.institution.update({
      where: { id },
      data: { status: 'REJECTED' as any, isActive: false },
    });
  }

  // ─── Network-wide KPI stats ─────────────────────────────────────────────────
  async networkStats() {
    const now   = new Date();
    const in7d  = new Date(now.getTime() + 7 * 86_400_000);

    const [
      totalInstitutions, active, pending, suspended,
      totalStudents, totalUsers, totalBulletins, totalPayments,
      trialCount, activeSubCount, expiredCount, expiringCount,
    ] = await Promise.all([
      this.prisma.institution.count(),
      this.prisma.institution.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.institution.count({ where: { status: 'PENDING' as any } }),
      this.prisma.institution.count({ where: { status: 'SUSPENDED' as any } }),
      this.prisma.student.count(),
      this.prisma.user.count({ where: { role: { not: 'SUPERADMIN' as any } } }),
      this.prisma.reportCard.count(),
      this.prisma.payment.count(),
      (this.prisma as any).institution.count({ where: { subscriptionStatus: 'TRIAL' } }),
      (this.prisma as any).institution.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      (this.prisma as any).institution.count({ where: { subscriptionStatus: 'EXPIRED' } }),
      (this.prisma as any).institution.count({
        where: { subscriptionStatus: 'TRIAL', trialEndsAt: { gte: now, lt: in7d } },
      }),
    ]);

    const recentSchools = await this.prisma.institution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, country: true, status: true, createdAt: true },
    });

    return {
      institutions: { total: totalInstitutions, active, pending, suspended },
      network:       { students: totalStudents, users: totalUsers, bulletins: totalBulletins, payments: totalPayments },
      subscription:  { trial: trialCount, active: activeSubCount, expired: expiredCount, expiringIn7: expiringCount },
      recentSchools,
    };
  }

  // ─── SuperAdmin: Send login reminder to school admin ────────────────────────
  async sendLoginReminder(id: string) {
    const institution = await this.findInstitutionOrThrow(id);

    const admins = await this.prisma.user.findMany({
      where: { institutionId: id, role: Role.ADMIN as any },
      select: { name: true, email: true },
    });

    if (!admins.length) {
      throw new NotFoundException(`Aucun administrateur trouvé pour l'établissement ${id}`);
    }

    let sent = 0;
    for (const admin of admins) {
      const ok = await this.mail.sendLoginReminder(admin.name, admin.email, institution.name);
      if (ok) sent++;
    }

    return { sent, total: admins.length };
  }

  // ─── SuperAdmin: Update owner notes ─────────────────────────────────────────
  async updateNotes(id: string, notes: string) {
    await this.findInstitutionOrThrow(id);
    return this.prisma.institution.update({
      where: { id },
      data: { ownerNotes: notes },
    });
  }

  // ─── SuperAdmin: Update subscription plan ───────────────────────────────────
  async updateSubscriptionPlan(id: string, plan: string) {
    await this.findInstitutionOrThrow(id);
    return this.prisma.institution.update({
      where: { id },
      data: { subscriptionPlan: plan || null },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private async findInstitutionOrThrow(id: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) {
      throw new NotFoundException(`Institution ${id} introuvable`);
    }
    return institution;
  }
}
