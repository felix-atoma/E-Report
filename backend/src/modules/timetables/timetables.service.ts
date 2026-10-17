import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async findMySchedule(teacherId: string, institutionId: string, academicYear: string) {
    return this.prisma.timetableSlot.findMany({
      where: { teacherId, institutionId, academicYear },
      include: {
        subject: { select: { id: true, nameFr: true, code: true, category: true } },
        class:   { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async save(classId: string, dto: SaveTimetableDto, institutionId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');

    // Champs vides (« Aucun professeur », salle vide) → null : un identifiant "" faisait échouer
    // l'enregistrement (erreur 500, professeur introuvable).
    const slots = dto.slots.map((s) => ({ ...s, teacherId: s.teacherId || null, room: s.room?.trim() || null }));
    const subjectIds = [...new Set(slots.map((s) => s.subjectId))];
    const teacherIds = [...new Set(slots.map((s) => s.teacherId).filter(Boolean))] as string[];
    const [subjectCount, teacherCount] = await Promise.all([
      this.prisma.subject.count({ where: { id: { in: subjectIds }, institutionId } }),
      teacherIds.length ? this.prisma.user.count({ where: { id: { in: teacherIds }, institutionId } }) : Promise.resolve(0),
    ]);
    if (subjectCount !== subjectIds.length) throw new BadRequestException("Une matière de l'emploi du temps est introuvable. Rechargez la page et réessayez.");
    if (teacherCount !== teacherIds.length) throw new BadRequestException("Un professeur de l'emploi du temps est introuvable. Rechargez la page et réessayez.");
    for (const s of slots) {
      if (!/^\d{2}:\d{2}$/.test(s.startTime) || !/^\d{2}:\d{2}$/.test(s.endTime) || s.endTime <= s.startTime) {
        throw new BadRequestException(`Horaire invalide (${s.startTime} – ${s.endTime}) : l'heure de fin doit être après l'heure de début.`);
      }
    }

    // Replace all slots for this class + academicYear
    await this.prisma.timetableSlot.deleteMany({
      where: { classId, academicYear: dto.academicYear, institutionId },
    });

    if (slots.length > 0) {
      await this.prisma.timetableSlot.createMany({
        data: slots.map((s) => ({
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
