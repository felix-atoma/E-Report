import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateBulletinDto } from './dto/create-bulletin.dto';

@Injectable()
export class BulletinsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string) {
    return this.prisma.bulletin.findMany({
      where: { institutionId },
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
