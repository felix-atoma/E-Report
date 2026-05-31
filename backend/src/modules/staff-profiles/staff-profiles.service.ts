import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertStaffProfileDto } from './dto/upsert-staff-profile.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  profileImage: true,
  whatsappNumber: true,
};

@Injectable()
export class StaffProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertStaffProfileDto, institutionId: string) {
    // Verify user belongs to institution
    const user = await this.prisma.user.findFirst({ where: { id: userId, institutionId } });
    if (!user) throw new NotFoundException('User not found in this institution');

    return this.prisma.staffProfile.upsert({
      where: { userId },
      create: {
        userId,
        institutionId,
        ...dto,
        employmentDate: dto.employmentDate ? new Date(dto.employmentDate) : undefined,
      },
      update: {
        ...dto,
        employmentDate: dto.employmentDate ? new Date(dto.employmentDate) : undefined,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async list(institutionId: string) {
    return this.prisma.staffProfile.findMany({
      where: { institutionId },
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, institutionId: string) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId, institutionId },
      include: { user: { select: USER_SELECT } },
    });
    if (!profile) throw new NotFoundException('Staff profile not found');
    return profile;
  }

  async remove(userId: string, institutionId: string) {
    const profile = await this.prisma.staffProfile.findFirst({ where: { userId, institutionId } });
    if (!profile) throw new NotFoundException('Staff profile not found');
    return this.prisma.staffProfile.delete({ where: { userId } });
  }
}
