import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateAcademicSettingsDto } from './dto/update-academic-settings.dto';

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      include: { brandingAssets: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    return institution;
  }

  async update(institutionId: string, dto: UpdateInstitutionDto) {
    await this.ensureExists(institutionId);
    return this.prisma.institution.update({ where: { id: institutionId }, data: dto });
  }

  async updateBranding(institutionId: string, dto: UpdateBrandingDto) {
    const existing = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { brandingSettings: true },
    });
    if (!existing) throw new NotFoundException('Institution not found');

    // Merge color/favicon fields into the brandingSettings JSON blob
    const currentBranding = (existing.brandingSettings as Record<string, unknown>) ?? {};
    const mergedBranding: Record<string, unknown> = { ...currentBranding, ...(dto.brandingSettings ?? {}) };
    if (dto.primaryColor !== undefined)   mergedBranding.primaryColor   = dto.primaryColor;
    if (dto.secondaryColor !== undefined) mergedBranding.secondaryColor = dto.secondaryColor;
    if (dto.faviconUrl !== undefined)     mergedBranding.faviconUrl     = dto.faviconUrl;

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        ...(dto.logo    !== undefined && { logo:  dto.logo }),
        ...(dto.logoUrl !== undefined && { logo:  dto.logoUrl }),
        ...(dto.crest   !== undefined && { crest: dto.crest }),
        ...(dto.stamp   !== undefined && { stamp: dto.stamp }),
        ...(dto.schoolMotto !== undefined && { motto:    dto.schoolMotto }),
        ...(dto.address     !== undefined && { address:  dto.address }),
        ...(dto.phone       !== undefined && { phone:    dto.phone }),
        ...(dto.website     !== undefined && { website:  dto.website }),
        brandingSettings: mergedBranding as any,
      },
    });
  }

  async updateAcademicSettings(institutionId: string, dto: UpdateAcademicSettingsDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { academicSettings: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const current = (institution.academicSettings as Record<string, unknown>) ?? {};
    const merged = { ...current, ...dto };

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: { academicSettings: merged },
    });
  }

  private async ensureExists(institutionId: string) {
    const exists = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!exists) throw new NotFoundException('Institution not found');
  }
}
