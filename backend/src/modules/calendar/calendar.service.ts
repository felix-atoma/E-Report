import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, role: Role) {
    const where: any = { institutionId };
    if (role === Role.PARENT || role === Role.STUDENT) {
      where.isPublic = true;
    }
    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  async create(dto: CreateCalendarEventDto, institutionId: string, userId: string) {
    return this.prisma.calendarEvent.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        institutionId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateCalendarEventDto>, institutionId: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, institutionId } });
    if (!event) throw new NotFoundException('Calendar event not found');
    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, institutionId } });
    if (!event) throw new NotFoundException('Calendar event not found');
    return this.prisma.calendarEvent.delete({ where: { id } });
  }
}
