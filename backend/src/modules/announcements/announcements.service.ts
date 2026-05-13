import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, userId: string, role: Role, classId?: string) {
    const where: any = { institutionId };

    if (role === Role.STUDENT) {
      const student = await this.prisma.student.findFirst({ where: { userId } });
      if (student) {
        const enrollment = await this.prisma.classStudent.findFirst({
          where: { studentId: student.id },
          orderBy: { class: { createdAt: 'desc' } },
        });
        where.OR = [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          { audience: 'CLASS', classId: enrollment?.classId ?? '__none__' },
        ];
      }
    } else if (role === Role.PARENT) {
      where.OR = [{ audience: 'ALL' }, { audience: 'PARENTS' }];
    } else if (role === Role.TEACHER) {
      where.OR = [{ audience: 'ALL' }, { audience: 'TEACHERS' }];
      if (classId) where.classId = classId;
    } else {
      // ADMIN / BURSAR — see everything
      if (classId) where.classId = classId;
    }

    return this.prisma.announcement.findMany({
      where,
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateAnnouncementDto, institutionId: string, authorId: string) {
    return this.prisma.announcement.create({
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        authorId,
        institutionId,
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: Partial<CreateAnnouncementDto>, institutionId: string, userId: string, role: Role) {
    const ann = await this.prisma.announcement.findFirst({ where: { id, institutionId } });
    if (!ann) throw new NotFoundException('Announcement not found');
    if (role !== Role.ADMIN && ann.authorId !== userId) throw new ForbiddenException();
    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async remove(id: string, institutionId: string, userId: string, role: Role) {
    const ann = await this.prisma.announcement.findFirst({ where: { id, institutionId } });
    if (!ann) throw new NotFoundException('Announcement not found');
    if (role !== Role.ADMIN && ann.authorId !== userId) throw new ForbiddenException();
    return this.prisma.announcement.delete({ where: { id } });
  }
}
