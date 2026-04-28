import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string) {
    return this.prisma.subject.findMany({
      where: { institutionId, isActive: true },
      orderBy: [{ category: 'asc' }, { nameFr: 'asc' }],
    });
  }

  async findOne(id: string, institutionId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, institutionId },
      include: {
        classSubjects: {
          include: {
            class: { select: { id: true, name: true, academicYear: true } },
            teacher: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async create(dto: CreateSubjectDto, institutionId: string) {
    const existing = await this.prisma.subject.findUnique({
      where: { institutionId_code: { institutionId, code: dto.code } },
    });
    if (existing) throw new ConflictException(`Subject code '${dto.code}' already exists`);

    return this.prisma.subject.create({
      data: { ...dto, institutionId },
    });
  }

  async update(id: string, dto: UpdateSubjectDto, institutionId: string) {
    await this.ensureExists(id, institutionId);

    if (dto.code) {
      const conflict = await this.prisma.subject.findFirst({
        where: { institutionId, code: dto.code, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Subject code '${dto.code}' already exists`);
    }

    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async deactivate(id: string, institutionId: string) {
    await this.ensureExists(id, institutionId);
    return this.prisma.subject.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureExists(id: string, institutionId: string) {
    const s = await this.prisma.subject.findFirst({ where: { id, institutionId } });
    if (!s) throw new NotFoundException('Subject not found');
  }
}
