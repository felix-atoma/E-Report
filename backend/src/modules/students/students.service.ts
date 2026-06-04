import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
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
    return this.prisma.student.findMany({
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
            status: true, overallAverage: true, mention: true,
          },
          orderBy: [{ academicYear: 'desc' }, { termNumber: 'desc' }],
          take: 3,
        },
      },
      orderBy: { user: { name: 'asc' } },
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

    const userRecord = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email ?? `student-${admissionNumber}@noreply.local`,
        password: tempPassword,
        role: 'STUDENT',
        institutionId,
      },
      select: { id: true },
    });

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

  private async ensureExists(id: string, institutionId: string) {
    const s = await this.prisma.student.findFirst({ where: { id, institutionId } });
    if (!s) throw new NotFoundException('Student not found');
  }
}
