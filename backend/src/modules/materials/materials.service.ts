import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateMaterialDto } from './dto/create-material.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, classId?: string, subjectId?: string, academicYear?: string) {
    return this.prisma.courseMaterial.findMany({
      where: {
        institutionId,
        ...(classId && { classId }),
        ...(subjectId && { subjectId }),
        ...(academicYear && { academicYear }),
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        subject: { select: { id: true, nameFr: true, code: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateMaterialDto, institutionId: string, uploadedById: string) {
    return this.prisma.courseMaterial.create({
      data: { ...dto, uploadedById, institutionId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        subject: { select: { id: true, nameFr: true } },
      },
    });
  }

  async remove(id: string, institutionId: string, userId: string, role: Role) {
    const mat = await this.prisma.courseMaterial.findFirst({ where: { id, institutionId } });
    if (!mat) throw new NotFoundException('Material not found');
    if (role !== Role.ADMIN && mat.uploadedById !== userId) throw new ForbiddenException();
    return this.prisma.courseMaterial.delete({ where: { id } });
  }
}
