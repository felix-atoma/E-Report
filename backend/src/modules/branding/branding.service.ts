import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrandingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string) {
    return this.prisma.brandingAsset.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(institutionId: string, type: string, fileUrl: string, label?: string) {
    return this.prisma.brandingAsset.create({
      data: { institutionId, type, fileUrl, label },
    });
  }

  async remove(id: string, institutionId: string) {
    const asset = await this.prisma.brandingAsset.findFirst({ where: { id, institutionId } });
    if (!asset) throw new NotFoundException('Branding asset not found');
    await this.prisma.brandingAsset.delete({ where: { id } });
    return { message: 'Asset deleted' };
  }
}
