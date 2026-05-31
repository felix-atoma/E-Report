import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDocumentDto } from './dto/create-school-document.dto';
import { DocumentCategory } from '@prisma/client';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class SchoolDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, role: Role, category?: DocumentCategory) {
    const where: any = { institutionId };
    if (category) where.category = category;
    if (role === Role.PARENT || role === Role.STUDENT) where.isPublic = true;

    return this.prisma.schoolDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateSchoolDocumentDto, institutionId: string, uploadedById: string) {
    return this.prisma.schoolDocument.create({
      data: { ...dto, institutionId, uploadedById },
    });
  }

  async update(id: string, dto: Partial<CreateSchoolDocumentDto>, institutionId: string) {
    const doc = await this.prisma.schoolDocument.findFirst({ where: { id, institutionId } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.schoolDocument.update({ where: { id }, data: dto });
  }

  async remove(id: string, institutionId: string) {
    const doc = await this.prisma.schoolDocument.findFirst({ where: { id, institutionId } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.schoolDocument.delete({ where: { id } });
  }
}
