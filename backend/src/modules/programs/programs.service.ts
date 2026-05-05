import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { UpsertProgramDto } from './dto/upsert-program.dto';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(classId: string, subjectId: string, academicYear: string, institutionId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    const program = await this.prisma.subjectProgram.findUnique({
      where: { classId_subjectId_academicYear: { classId, subjectId, academicYear } },
      include: {
        chapters: { orderBy: { order: 'asc' } },
        subject: { select: { id: true, nameFr: true, code: true } },
        class: { select: { id: true, name: true } },
      },
    });

    return program ?? { classId, subjectId, academicYear, description: null, chapters: [] };
  }

  async upsert(
    classId: string,
    subjectId: string,
    dto: UpsertProgramDto,
    institutionId: string,
    userId: string,
    role: Role,
  ) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    if (role === Role.TEACHER) {
      const cs = await this.prisma.classSubject.findUnique({
        where: { classId_subjectId: { classId, subjectId } },
      });
      if (cs?.teacherId !== userId) {
        throw new ForbiddenException('Seul le professeur assigné à cette matière peut modifier le programme');
      }
    }

    const program = await this.prisma.subjectProgram.upsert({
      where: { classId_subjectId_academicYear: { classId, subjectId, academicYear: dto.academicYear } },
      create: { classId, subjectId, academicYear: dto.academicYear, description: dto.description },
      update: { description: dto.description },
    });

    // Replace chapters: delete existing, create new ones
    await this.prisma.programChapter.deleteMany({ where: { programId: program.id } });
    if (dto.chapters.length > 0) {
      await this.prisma.programChapter.createMany({
        data: dto.chapters.map((ch) => ({
          programId:   program.id,
          order:       ch.order,
          title:       ch.title,
          plan:        ch.plan,
          objectives:  ch.objectives,
          duration:    ch.duration,
          isCompleted: ch.isCompleted ?? false,
        })),
      });
    }

    return this.findOne(classId, subjectId, dto.academicYear, institutionId);
  }

  async listForClass(classId: string, academicYear: string, institutionId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    return this.prisma.subjectProgram.findMany({
      where: { classId, academicYear },
      include: {
        subject: { select: { id: true, nameFr: true, code: true } },
        chapters: { orderBy: { order: 'asc' } },
      },
      orderBy: { subject: { nameFr: 'asc' } },
    });
  }
}
