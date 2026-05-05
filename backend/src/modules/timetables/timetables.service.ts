import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveTimetableDto } from './dto/save-timetable.dto';

@Injectable()
export class TimetablesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByClass(classId: string, academicYear: string, institutionId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    return this.prisma.timetableSlot.findMany({
      where: { classId, academicYear, institutionId },
      include: {
        subject: { select: { id: true, nameFr: true, code: true, category: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async save(classId: string, dto: SaveTimetableDto, institutionId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    // Replace all slots for this class + academicYear
    await this.prisma.timetableSlot.deleteMany({
      where: { classId, academicYear: dto.academicYear, institutionId },
    });

    if (dto.slots.length > 0) {
      await this.prisma.timetableSlot.createMany({
        data: dto.slots.map((s) => ({
          classId,
          institutionId,
          academicYear: dto.academicYear,
          subjectId:   s.subjectId,
          teacherId:   s.teacherId ?? null,
          dayOfWeek:   s.dayOfWeek,
          startTime:   s.startTime,
          endTime:     s.endTime,
          room:        s.room ?? null,
        })),
      });
    }

    return this.findByClass(classId, dto.academicYear, institutionId);
  }
}
