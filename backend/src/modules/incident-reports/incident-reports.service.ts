import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-report.dto';

const REPORTER_SELECT = {
  id: true, name: true, role: true,
} as const;

@Injectable()
export class IncidentReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIncidentReportDto, institutionId: string, userId: string) {
    return this.prisma.incidentReport.create({
      data: {
        category:    dto.category,
        title:       dto.title,
        description: dto.description,
        accusedName: dto.accusedName,
        accusedRole: dto.accusedRole,
        anonymous:   dto.anonymous ?? false,
        reportedById: userId,
        institutionId,
      },
      include: { reportedBy: { select: REPORTER_SELECT } },
    });
  }

  async findAll(institutionId: string, status?: string, category?: string) {
    return this.prisma.incidentReport.findMany({
      where: {
        institutionId,
        ...(status   ? { status:   status   as any } : {}),
        ...(category ? { category: category as any } : {}),
      },
      include: { reportedBy: { select: REPORTER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(institutionId: string, userId: string) {
    return this.prisma.incidentReport.findMany({
      where: { institutionId, reportedById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, institutionId: string, userId: string, role: Role) {
    const report = await this.prisma.incidentReport.findFirst({
      where: { id, institutionId },
      include: { reportedBy: { select: REPORTER_SELECT } },
    });
    if (!report) throw new NotFoundException('Incident report not found');
    if (role !== Role.ADMIN && report.reportedById !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return report;
  }

  async updateStatus(id: string, institutionId: string, dto: UpdateIncidentStatusDto) {
    const report = await this.prisma.incidentReport.findFirst({ where: { id, institutionId } });
    if (!report) throw new NotFoundException('Incident report not found');
    return this.prisma.incidentReport.update({
      where: { id },
      data: { status: dto.status, adminNotes: dto.adminNotes },
      include: { reportedBy: { select: REPORTER_SELECT } },
    });
  }

  async remove(id: string, institutionId: string) {
    const report = await this.prisma.incidentReport.findFirst({ where: { id, institutionId } });
    if (!report) throw new NotFoundException('Incident report not found');
    await this.prisma.incidentReport.delete({ where: { id } });
    return { message: 'Incident report deleted' };
  }
}
