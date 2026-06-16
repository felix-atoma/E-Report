import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { MailService } from '../mail/mail.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const STUDENT_INCLUDE = {
  user: { select: { id: true, name: true, email: true, profileImage: true } },
  parent: { select: { id: true, name: true, email: true, whatsappNumber: true } },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pdf: PdfService,
    private readonly mail: MailService,
  ) {}

  /** STUDENT: fetch their own profile via linked userId */
  async findMe(userId: string, institutionId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId, institutionId },
      include: {
        user: { select: { id: true, name: true, email: true, profileImage: true } },
        parent: { select: { id: true, name: true, email: true } },
        classes: {
          include: { class: { select: { id: true, name: true, level: true, academicYear: true } } },
          orderBy: { academicYear: 'desc' },
        },
        reportCards: {
          select: {
            id: true, academicYear: true, termNumber: true, termName: true,
            status: true, overallAverage: true, classRank: true, classSize: true,
            mention: true,
          },
          orderBy: [{ academicYear: 'desc' }, { termNumber: 'desc' }],
        },
      },
    });
    if (!student) throw new NotFoundException('Student profile not found');
    return student;
  }

  /** PARENT: fetch all children linked to this parent user */
  async findMyChildren(parentUserId: string, institutionId: string) {
    const students = await this.prisma.student.findMany({
      where: { parentId: parentUserId, institutionId },
      include: {
        user: { select: { id: true, name: true, email: true, profileImage: true } },
        classes: {
          include: { class: { select: { id: true, name: true, level: true, academicYear: true } } },
          orderBy: { academicYear: 'desc' },
          take: 1,
        },
        reportCards: {
          select: {
            id: true, academicYear: true, termNumber: true, termName: true,
            status: true, overallAverage: true, mention: true, deliveryStatus: true,
          },
          orderBy: [{ academicYear: 'desc' }, { termNumber: 'desc' }],
          take: 3,
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    if (!students.length) return [];

    // Determine current academic year from the most recent class enrollment
    const academicYear =
      students.flatMap((s) => s.classes).sort((a, b) =>
        b.academicYear > a.academicYear ? 1 : -1,
      )[0]?.academicYear ?? `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

    const ids = students.map((s) => s.id);
    const [fees, payments] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { studentId: { in: ids }, academicYear },
        select: { studentId: true, amountDue: true, isExempt: true },
      }),
      this.prisma.payment.findMany({
        where: { studentId: { in: ids }, academicYear },
        select: { studentId: true, amount: true },
      }),
    ]);

    const dueMap  = new Map<string, number>();
    const paidMap = new Map<string, number>();
    const exemptMap = new Map<string, boolean>();

    for (const f of fees) {
      if (f.isExempt) { exemptMap.set(f.studentId, true); continue; }
      dueMap.set(f.studentId, (dueMap.get(f.studentId) ?? 0) + Number(f.amountDue));
    }
    for (const p of payments) {
      paidMap.set(p.studentId, (paidMap.get(p.studentId) ?? 0) + Number(p.amount));
    }

    return students.map((s) => {
      const due  = dueMap.get(s.id) ?? 0;
      const paid = paidMap.get(s.id) ?? 0;
      let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'EXEMPT' | null = null;
      if (exemptMap.get(s.id)) paymentStatus = 'EXEMPT';
      else if (due === 0) paymentStatus = null;
      else if (paid >= due) paymentStatus = 'PAID';
      else if (paid > 0) paymentStatus = 'PARTIAL';
      else paymentStatus = 'UNPAID';

      return {
        ...s,
        academicYear,
        feeBalance: { due, paid, remaining: Math.max(0, due - paid) },
        paymentStatus,
      };
    });
  }

  async findAll(institutionId: string, classId?: string) {
    return this.prisma.student.findMany({
      where: {
        institutionId,
        ...(classId ? { classes: { some: { classId } } } : {}),
      },
      include: {
        ...STUDENT_INCLUDE,
        classes: {
          include: { class: { select: { id: true, name: true, academicYear: true } } },
          orderBy: { academicYear: 'desc' },
          take: 1,
        },
      },
      orderBy: { user: { name: 'asc' } },
    });
  }

  async findOne(id: string, institutionId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, institutionId },
      include: {
        user: { select: { id: true, name: true, email: true, profileImage: true } },
        parent: {
          select: {
            id: true, name: true, email: true,
            whatsappNumber: true, whatsappVerified: true,
          },
        },
        classes: {
          include: { class: { select: { id: true, name: true, level: true, academicYear: true } } },
          orderBy: { academicYear: 'desc' },
        },
        reportCards: {
          select: {
            id: true, academicYear: true, termNumber: true, termName: true,
            status: true, overallAverage: true, classRank: true, classSize: true,
            classHighest: true, classLowest: true, classAverage: true,
            mention: true, conductRating: true,
            warnings: true, commendations: true, honorCouncil: true,
            attendanceDays: true, attendancePresent: true,
            attendanceLate: true, attendanceAbsent: true,
          },
          orderBy: [{ academicYear: 'desc' }, { termNumber: 'desc' }],
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  private async generateAdmissionNumber(institutionId: string, year: number): Promise<string> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true },
    });

    const prefix = (institution?.name ?? 'SCH')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase()
      || 'SCH';

    const yearStart = new Date(`${year}-01-01`);
    const yearEnd   = new Date(`${year + 1}-01-01`);
    const count = await this.prisma.student.count({
      where: {
        institutionId,
        enrollmentDate: { gte: yearStart, lt: yearEnd },
      },
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `${prefix}-${year}-${sequence}`;
  }

  async create(dto: CreateStudentDto, institutionId: string) {
    if (dto.admissionNumber) {
      const existing = await this.prisma.student.findUnique({
        where: { admissionNumber: dto.admissionNumber },
      });
      if (existing) throw new ConflictException('Admission number already in use');
    }

    const enrollYear = dto.enrollmentDate
      ? new Date(dto.enrollmentDate).getFullYear()
      : new Date().getFullYear();

    const admissionNumber = dto.admissionNumber
      || await this.generateAdmissionNumber(institutionId, enrollYear);

    // Resolve parentId from parentEmail if provided
    let parentId = dto.parentId;
    if (!parentId && dto.parentEmail) {
      const parent = await this.prisma.user.findFirst({
        where: { email: dto.parentEmail, institutionId },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException(`No parent account found for email: ${dto.parentEmail}`);
      parentId = parent.id;
    } else if (parentId) {
      const parent = await this.prisma.user.findFirst({ where: { id: parentId, institutionId } });
      if (!parent) throw new NotFoundException('Parent user not found');
    }

    // Validate class if provided
    let classRecord: { id: string; academicYear: string } | null = null;
    if (dto.classId) {
      classRecord = await this.prisma.class.findFirst({
        where: { id: dto.classId, institutionId },
        select: { id: true, academicYear: true },
      });
      if (!classRecord) throw new NotFoundException('Class not found');
    }

    // Create linked STUDENT user account when name is provided (always, since name is required)
    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const tempPassword = await bcrypt.hash(
      `Temp@${Math.random().toString(36).slice(2, 10)}`,
      Number(saltRounds),
    );

    if (dto.email) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingUser) throw new ConflictException('Email already in use by another user');
    }

    // Real email provided → send a welcome OTP so the student can set their own password
    const hasRealEmail = !!dto.email;
    const otp = hasRealEmail ? crypto.randomUUID().replace(/-/g, '').toUpperCase() : null;
    const otpHash = otp ? await bcrypt.hash(otp, 10) : null;
    const otpExpiresAt = otp ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const userRecord = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email ?? `student-${admissionNumber}@noreply.local`,
        password: tempPassword,
        role: 'STUDENT',
        institutionId,
        ...(hasRealEmail ? { mustChangePassword: true, otpHash, otpExpiresAt } : {}),
      },
      select: { id: true, institution: { select: { name: true } } },
    });

    if (hasRealEmail && otp) {
      this.mail.sendWelcomeOtp(
        dto.email!,
        dto.name,
        otp,
        userRecord.institution?.name ?? 'NovaBulletin',
      ).catch(() => {/* logged inside service */});
    }

    const student = await this.prisma.student.create({
      data: {
        admissionNumber,
        dateOfBirth: new Date(dto.dateOfBirth),
        enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : undefined,
        sex: dto.sex,
        parentId,
        institutionId,
        userId: userRecord.id,
      },
      include: STUDENT_INCLUDE,
    });

    // Enroll in class if provided
    if (classRecord) {
      await this.prisma.classStudent.create({
        data: {
          classId: classRecord.id,
          studentId: student.id,
          academicYear: classRecord.academicYear,
        },
      });
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto, institutionId: string) {
    await this.ensureExists(id, institutionId);

    if (dto.parentId) {
      const parent = await this.prisma.user.findFirst({ where: { id: dto.parentId, institutionId } });
      if (!parent) throw new NotFoundException('Parent user not found');
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.admissionNumber && { admissionNumber: dto.admissionNumber }),
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.sex !== undefined && { sex: dto.sex }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        // Extended profile fields
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.region !== undefined && { region: dto.region }),
        ...(dto.nationality !== undefined && { nationality: dto.nationality }),
        ...(dto.religion !== undefined && { religion: dto.religion }),
        ...(dto.bloodType !== undefined && { bloodType: dto.bloodType }),
        ...(dto.medicalConditions !== undefined && { medicalConditions: dto.medicalConditions }),
        ...(dto.allergies !== undefined && { allergies: dto.allergies }),
        ...(dto.emergencyContactName !== undefined && { emergencyContactName: dto.emergencyContactName }),
        ...(dto.emergencyContactPhone !== undefined && { emergencyContactPhone: dto.emergencyContactPhone }),
        ...(dto.emergencyContactRelation !== undefined && { emergencyContactRelation: dto.emergencyContactRelation }),
        ...(dto.fatherName !== undefined && { fatherName: dto.fatherName }),
        ...(dto.fatherPhone !== undefined && { fatherPhone: dto.fatherPhone }),
        ...(dto.fatherOccupation !== undefined && { fatherOccupation: dto.fatherOccupation }),
        ...(dto.motherName !== undefined && { motherName: dto.motherName }),
        ...(dto.motherPhone !== undefined && { motherPhone: dto.motherPhone }),
        ...(dto.motherOccupation !== undefined && { motherOccupation: dto.motherOccupation }),
        ...(dto.previousSchool !== undefined && { previousSchool: dto.previousSchool }),
        ...(dto.birthPlace !== undefined && { birthPlace: dto.birthPlace }),
        ...(dto.birthCertificateNumber !== undefined && { birthCertificateNumber: dto.birthCertificateNumber }),
        ...(dto.photo !== undefined && { photo: dto.photo }),
        ...(dto.studentStatus !== undefined && { studentStatus: dto.studentStatus }),
      },
      include: {
        user: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, whatsappNumber: true } },
      },
    });
  }

  async bulkRemove(ids: string[], institutionId: string) {
    for (const id of ids) {
      try { await this.remove(id, institutionId); } catch { /* skip already-deleted or not-found */ }
    }
    return { deleted: ids.length };
  }

  async remove(id: string, institutionId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, institutionId },
      select: { id: true, userId: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationLog.deleteMany({ where: { studentId: id } });
      await tx.payment.deleteMany({ where: { studentId: id } });
      await tx.studentFee.deleteMany({ where: { studentId: id } });
      await tx.classStudent.deleteMany({ where: { studentId: id } });
      await tx.reportCard.deleteMany({ where: { studentId: id } });
      await tx.student.delete({ where: { id } });
      if (student.userId) {
        await tx.notificationLog.deleteMany({ where: { recipientUserId: student.userId } });
        await tx.user.delete({ where: { id: student.userId } });
      }
    });

    return { message: 'Student deleted' };
  }

  async bulkImport(
    rows: Array<{ name: string; dateOfBirth: string; sex?: string; admissionNumber?: string; email?: string; className?: string }>,
    institutionId: string,
  ) {
    // Pre-build a class name lookup map (case-insensitive) for this institution
    const classes = await this.prisma.class.findMany({
      where: { institutionId, isActive: true },
      select: { id: true, name: true },
    });
    const classMap = new Map<string, string>(
      classes.map((c) => [c.name.toLowerCase().trim(), c.id]),
    );

    const results: { success: boolean; name: string; error?: string }[] = [];
    for (const row of rows) {
      try {
        // Resolve classId from className if provided
        let classId: string | undefined;
        if (row.className) {
          classId = classMap.get(row.className.toLowerCase().trim());
          if (!classId) {
            results.push({ success: false, name: row.name, error: `Classe introuvable : "${row.className}"` });
            continue;
          }
        }

        await this.create(
          {
            name: row.name,
            dateOfBirth: row.dateOfBirth,
            sex: row.sex as 'M' | 'F' | undefined,
            admissionNumber: row.admissionNumber || undefined,
            email: row.email || undefined,
            classId,
          },
          institutionId,
        );
        results.push({ success: true, name: row.name });
      } catch (e: any) {
        results.push({ success: false, name: row.name, error: e.message });
      }
    }
    return {
      created: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async yearRollover(fromYear: string, toYear: string, institutionId: string) {
    // Find all enrollments from the source year for this institution
    const enrollments = await this.prisma.classStudent.findMany({
      where: {
        academicYear: fromYear,
        class: { institutionId },
      },
      select: { classId: true, studentId: true },
    });

    if (enrollments.length === 0) {
      return { enrolled: 0, message: `Aucun élève trouvé pour l'année ${fromYear}` };
    }

    // Re-enroll into the same classes with the new year (skipDuplicates avoids errors if already done)
    const result = await this.prisma.classStudent.createMany({
      data: enrollments.map((e) => ({
        classId: e.classId,
        studentId: e.studentId,
        academicYear: toYear,
      })),
      skipDuplicates: true,
    });

    // Update institution's currentYear in academicSettings
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        academicSettings: {
          currentYear: toYear,
        },
      },
    });

    return {
      enrolled: result.count,
      message: `${result.count} inscriptions créées pour l'année ${toYear}`,
    };
  }

  async generateCertificate(
    id: string,
    institutionId: string,
    type: 'enrollment' | 'conduct',
  ): Promise<Buffer> {
    const student = await this.prisma.student.findFirst({
      where: { id, institutionId },
      include: {
        user:        { select: { name: true } },
        institution: { select: { name: true, address: true, phone: true, logo: true, motto: true } },
        classes: {
          include: { class: { select: { name: true, academicYear: true } } },
          orderBy: { academicYear: 'desc' },
          take: 1,
        },
      },
    });
    if (!student) throw new NotFoundException('Élève introuvable');

    const name         = student.user?.name ?? student.admissionNumber;
    const schoolName   = student.institution.name;
    const schoolAddr   = student.institution.address ?? '';
    const cls          = student.classes?.[0]?.class;
    const className    = cls?.name ?? '—';
    const academicYear = cls?.academicYear ?? `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
    const dob          = student.dateOfBirth
      ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;
    const today        = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const logoTag      = student.institution.logo
      ? `<img src="${student.institution.logo}" style="width:64px;height:64px;object-fit:contain;margin-bottom:8px"/>`
      : '';

    const baseStyles = `
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;padding:32px}
      .cert{max-width:640px;margin:0 auto;border:3px double #1e3a8a;padding:36px}
      .cert__header{text-align:center;margin-bottom:24px;border-bottom:2px solid #1e3a8a;padding-bottom:18px}
      .cert__school{font-size:19px;font-weight:900;color:#1e3a8a;text-transform:uppercase;letter-spacing:1px;margin-top:6px}
      .cert__address{font-size:11px;color:#6b7280;margin-top:4px}
      .cert__motto{font-size:11px;font-style:italic;color:#374151;margin-top:3px}
      .cert__title{font-size:15px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:2px;margin:22px 0;color:#1e3a8a;border:2px solid #1e3a8a;display:inline-block;padding:6px 24px}
      .cert__title-wrap{text-align:center;margin:18px 0}
      .cert__body{line-height:2.4;font-size:13.5px}
      .cert__underline{font-weight:800;font-size:15px;text-decoration:underline}
      .cert__footer{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
      .cert__stamp{width:110px;height:80px;border:1px dashed #9ca3af;text-align:center;padding:8px;font-size:10px;color:#9ca3af;display:flex;align-items:center;justify-content:center;line-height:1.4}
      .cert__sig{text-align:right;font-size:12px;line-height:2}
    `;

    let bodyHtml = '';
    if (type === 'enrollment') {
      bodyHtml = `
        <p>Je soussigné(e), le Directeur / la Directrice de <strong>${schoolName}</strong>,</p>
        <p>certifie que l'élève :</p>
        <p class="cert__underline">${name}</p>
        ${dob ? `<p>né(e) le <strong>${dob}</strong>,</p>` : ''}
        <p>portant le numéro matricule <strong>${student.admissionNumber}</strong>,</p>
        <p>est régulièrement inscrit(e) dans notre établissement en classe de :</p>
        <p style="font-size:16px;font-weight:700;text-align:center;padding:10px 0">${className}</p>
        <p>pour l'année scolaire <strong>${academicYear}</strong>.</p>
        <br/>
        <p>En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.</p>`;
    } else {
      bodyHtml = `
        <p>Je soussigné(e), le Directeur / la Directrice de <strong>${schoolName}</strong>,</p>
        <p>certifie que l'élève :</p>
        <p class="cert__underline">${name}</p>
        ${dob ? `<p>né(e) le <strong>${dob}</strong>,</p>` : ''}
        <p>portant le numéro matricule <strong>${student.admissionNumber}</strong>, en classe de <strong>${className}</strong>,</p>
        <p>a fait preuve, tout au long de l'année scolaire <strong>${academicYear}</strong>, d'une <strong>bonne conduite</strong> au sein de notre établissement.</p>
        <br/>
        <p>Aucun incident disciplinaire majeur n'a été relevé à son encontre durant cette période.</p>
        <br/>
        <p>En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.</p>`;
    }

    const title = type === 'enrollment' ? "Attestation d'Inscription" : 'Certificat de Bonne Conduite';

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<style>${baseStyles}</style>
</head><body>
<div class="cert">
  <div class="cert__header">
    ${logoTag}
    <div class="cert__school">${schoolName}</div>
    ${schoolAddr ? `<div class="cert__address">${schoolAddr}</div>` : ''}
    ${student.institution.motto ? `<div class="cert__motto">${student.institution.motto}</div>` : ''}
  </div>
  <div class="cert__title-wrap"><span class="cert__title">${title}</span></div>
  <div class="cert__body">${bodyHtml}</div>
  <div class="cert__footer">
    <div class="cert__stamp">Cachet de l'établissement</div>
    <div class="cert__sig">
      <p>Fait à ${schoolAddr || 'Lomé'}, le ${today}</p>
      <p><strong>Le Directeur / La Directrice</strong></p>
      <br/><br/>
      <p style="border-top:1px solid #374151;padding-top:4px;min-width:180px">Signature &amp; Cachet</p>
    </div>
  </div>
</div>
</body></html>`;

    return this.pdf.generateFromHtml(html);
  }

  private async ensureExists(id: string, institutionId: string) {
    const s = await this.prisma.student.findFirst({ where: { id, institutionId } });
    if (!s) throw new NotFoundException('Student not found');
  }
}
