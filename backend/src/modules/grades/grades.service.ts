import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { BulkGradesDto } from './dto/bulk-grades.dto';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByReport(reportId: string, requestingUserId: string, requestingRole: Role) {
    const report = await this.prisma.reportCard.findUnique({
      where: { id: reportId },
      include: { class: true },
    });
    if (!report) throw new NotFoundException('Report card not found');

    await this.assertAccess(report, requestingUserId, requestingRole);

    return this.prisma.grade.findMany({
      where: { reportCardId: reportId },
      include: {
        subject: { select: { id: true, nameFr: true, nameEn: true, code: true, passMark: true } },
      },
      orderBy: { subject: { nameFr: 'asc' } },
    });
  }

  async bulkUpsert(reportId: string, dto: BulkGradesDto, requestingUserId: string, requestingRole: Role) {
    const report = await this.prisma.reportCard.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report card not found');
    if (report.status === 'PUBLISHED') throw new ForbiddenException('Cannot edit grades on a published report');

    await this.assertAccess(report, requestingUserId, requestingRole);

    await this.prisma.$transaction(
      dto.grades.map((g) =>
        this.prisma.grade.upsert({
          where: { reportCardId_subjectId: { reportCardId: reportId, subjectId: g.subjectId } },
          create: {
            reportCardId: reportId,
            subjectId: g.subjectId,
            score: g.score,
            coefficient: g.coefficient,
            weightedScore: g.score * g.coefficient,
            teacherComment: g.teacherComment,
          },
          update: {
            score: g.score,
            coefficient: g.coefficient,
            weightedScore: g.score * g.coefficient,
            teacherComment: g.teacherComment,
          },
        }),
      ),
    );

    return this.findByReport(reportId, requestingUserId, requestingRole);
  }

  private async assertAccess(report: { createdById: string; classId: string }, userId: string, role: Role) {
    if (role === Role.ADMIN) return;
    if (role === Role.TEACHER) {
      if (report.createdById === userId) return;
      const cls = await this.prisma.class.findFirst({
        where: { id: report.classId, teacherId: userId },
      });
      if (cls) return;
      throw new ForbiddenException('You do not have access to this report');
    }
    throw new ForbiddenException('Access denied');
  }
}
