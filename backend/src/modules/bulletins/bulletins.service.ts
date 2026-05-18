import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateBulletinDto } from './dto/create-bulletin.dto';

@Injectable()
export class BulletinsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string, userId: string, role: Role) {
    // Admins, teachers and bursars see everything
    if (role === Role.ADMIN || role === Role.TEACHER || role === Role.BURSAR) {
      return this.prisma.bulletin.findMany({
        where: { institutionId },
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    // For students: fetch their classId so we can include class-targeted bulletins
    let studentClassId: string | null = null;
    if (role === Role.STUDENT) {
      const student = await this.prisma.student.findFirst({
        where: { userId, institutionId },
        include: {
          classes: {
            orderBy: { academicYear: 'desc' },
            take: 1,
            select: { classId: true },
          },
        },
      });
      studentClassId = student?.classes[0]?.classId ?? null;
    }

    // For parents: collect all children's classIds
    let childrenClassIds: string[] = [];
    if (role === Role.PARENT) {
      const children = await this.prisma.student.findMany({
        where: { parentId: userId, institutionId },
        include: {
          classes: {
            orderBy: { academicYear: 'desc' },
            take: 1,
            select: { classId: true },
          },
        },
      });
      childrenClassIds = children.flatMap((c) => c.classes.map((cl) => cl.classId));
    }

    const targetAudienceForRole = role === Role.STUDENT ? 'STUDENT' : 'PARENT';
    const classIds = role === Role.STUDENT
      ? (studentClassId ? [studentClassId] : [])
      : childrenClassIds;

    return this.prisma.bulletin.findMany({
      where: {
        institutionId,
        publishedAt: { not: null },           // only published bulletins for students/parents
        OR: [
          { targetAudience: 'ALL' },
          { targetAudience: targetAudienceForRole },
          ...(classIds.length > 0 ? [{ targetAudience: 'CLASS', targetId: { in: classIds } }] : []),
        ],
      },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, institutionId: string) {
    const bulletin = await this.prisma.bulletin.findFirst({
      where: { id, institutionId },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
    if (!bulletin) throw new NotFoundException('Bulletin not found');
    return bulletin;
  }

  async create(dto: CreateBulletinDto, institutionId: string, authorId: string) {
    return this.prisma.bulletin.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        targetAudience: dto.targetAudience,
        targetId: dto.targetId,
        authorId,
        institutionId,
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: Partial<CreateBulletinDto>, institutionId: string, userId: string, role: Role) {
    const bulletin = await this.prisma.bulletin.findFirst({ where: { id, institutionId } });
    if (!bulletin) throw new NotFoundException('Bulletin not found');
    if (role !== Role.ADMIN && bulletin.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own bulletins');
    }
    return this.prisma.bulletin.update({ where: { id }, data: dto });
  }

  async publish(id: string, institutionId: string, userId: string, role: Role) {
    const bulletin = await this.prisma.bulletin.findFirst({ where: { id, institutionId } });
    if (!bulletin) throw new NotFoundException('Bulletin not found');
    if (role !== Role.ADMIN && bulletin.authorId !== userId) {
      throw new ForbiddenException('You can only publish your own bulletins');
    }
    return this.prisma.bulletin.update({ where: { id }, data: { publishedAt: new Date() } });
  }

  async remove(id: string, institutionId: string, userId: string, role: Role) {
    const bulletin = await this.prisma.bulletin.findFirst({ where: { id, institutionId } });
    if (!bulletin) throw new NotFoundException('Bulletin not found');
    if (role !== Role.ADMIN && bulletin.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own bulletins');
    }
    await this.prisma.bulletin.delete({ where: { id } });
    return { message: 'Bulletin deleted' };
  }
}
