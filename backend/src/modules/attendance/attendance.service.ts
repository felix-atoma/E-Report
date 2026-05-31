import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async bulkUpsert(dto: BulkAttendanceDto, institutionId: string, recordedByName: string) {
    const date = new Date(dto.date);

    const ops = dto.entries.map(entry =>
      this.prisma.attendance.upsert({
        where: { studentId_classId_date: { studentId: entry.studentId, classId: dto.classId, date } },
        create: {
          studentId: entry.studentId,
          classId: dto.classId,
          subjectId: dto.subjectId ?? null,
          date,
          status: entry.status,
          note: entry.note ?? null,
          recordedBy: recordedByName,
        },
        update: {
          status: entry.status,
          note: entry.note ?? null,
          subjectId: dto.subjectId ?? null,
          recordedBy: recordedByName,
        },
      }),
    );

    return this.prisma.$transaction(ops);
  }

  async listByClass(
    classId: string,
    institutionId: string,
    date?: string,
    subjectId?: string,
  ) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    return this.prisma.attendance.findMany({
      where: {
        classId,
        ...(date ? { date: new Date(date) } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        subject: { select: { id: true, nameFr: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async listByStudent(studentId: string, institutionId: string, role: Role, userId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, institutionId } });
    if (!student) throw new NotFoundException('Student not found');

    if (role === Role.PARENT && student.parentId !== userId) {
      throw new NotFoundException('Student not found');
    }
    if (role === Role.STUDENT && student.userId !== userId) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.attendance.findMany({
      where: { studentId },
      include: { subject: { select: { id: true, nameFr: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async summary(classId: string, institutionId: string, academicYear: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    const records = await this.prisma.attendance.findMany({
      where: {
        classId,
        student: { institution: { id: institutionId } },
      },
      include: { student: { include: { user: { select: { name: true } } } } },
    });

    const byStudent: Record<string, { name: string; present: number; absent: number; late: number; excused: number }> = {};
    for (const r of records) {
      const key = r.studentId;
      if (!byStudent[key]) {
        byStudent[key] = {
          name: r.student.user?.name ?? r.student.admissionNumber,
          present: 0, absent: 0, late: 0, excused: 0,
        };
      }
      if (r.status === 'PRESENT') byStudent[key].present++;
      else if (r.status === 'ABSENT') byStudent[key].absent++;
      else if (r.status === 'LATE') byStudent[key].late++;
      else if (r.status === 'EXCUSED') byStudent[key].excused++;
    }

    return Object.entries(byStudent).map(([studentId, stats]) => ({ studentId, ...stats }));
  }

  async remove(id: string, institutionId: string) {
    const record = await this.prisma.attendance.findFirst({
      where: { id },
      include: { class: true },
    });
    if (!record || record.class.institutionId !== institutionId) {
      throw new NotFoundException('Attendance record not found');
    }
    return this.prisma.attendance.delete({ where: { id } });
  }
}
