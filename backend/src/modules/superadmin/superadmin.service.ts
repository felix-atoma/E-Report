import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { RegisterInstitutionDto } from './dto/register-institution.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  // ─── Public: Register a new school (PENDING) ────────────────────────────────
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
        isActive: false,
        status: 'PENDING' as any,
        declaredStudentCount: dto.declaredStudentCount ?? null,
      },
    });

    await this.prisma.user.create({
      data: {
        name: dto.adminName,
        email,
        password: hashedPassword,
        role: Role.ADMIN as any,
        isActive: false,
        institutionId: institution.id,
      },
    });

    this.mail
      .sendSchoolRegistration(dto.schoolName, dto.city, email)
      .catch((e) => this.logger.error('Mail notification failed', e));
    this.whatsapp
      .sendSchoolRegistration(dto.schoolName, dto.city)
      .catch((e) => this.logger.error('WhatsApp notification failed', e));

    return {
      message:
        'Votre demande a été soumise. Vous recevrez vos identifiants une fois approuvé.',
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
