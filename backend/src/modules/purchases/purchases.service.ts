import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, params?: { search?: string; from?: string; to?: string }) {
    const where: any = { institutionId };
    if (params?.search) {
      where.OR = [
        { itemName: { contains: params.search, mode: 'insensitive' } },
        { model: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params?.from || params?.to) {
      where.date = {};
      if (params.from) where.date.gte = new Date(params.from);
      if (params.to)   where.date.lte = new Date(params.to);
    }
    return this.prisma.purchase.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async summary(institutionId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { institutionId },
      select: { price: true },
    });
    const total = purchases.reduce((sum, p) => sum + Number(p.price), 0);
    return { count: purchases.length, total };
  }

  async create(dto: CreatePurchaseDto, institutionId: string, recordedById: string) {
    return this.prisma.purchase.create({
      data: {
        institutionId,
        recordedById,
        date:     new Date(dto.date),
        itemName: dto.itemName,
        model:    dto.model,
        price:    dto.price,
        notes:    dto.notes,
      },
    });
  }

  async update(id: string, dto: Partial<CreatePurchaseDto>, institutionId: string) {
    const item = await this.prisma.purchase.findFirst({ where: { id, institutionId } });
    if (!item) throw new NotFoundException('Purchase not found');
    return this.prisma.purchase.update({
      where: { id },
      data: {
        ...(dto.date     !== undefined && { date:     new Date(dto.date) }),
        ...(dto.itemName !== undefined && { itemName: dto.itemName }),
        ...(dto.model    !== undefined && { model:    dto.model }),
        ...(dto.price    !== undefined && { price:    dto.price }),
        ...(dto.notes    !== undefined && { notes:    dto.notes }),
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const item = await this.prisma.purchase.findFirst({ where: { id, institutionId } });
    if (!item) throw new NotFoundException('Purchase not found');
    return this.prisma.purchase.delete({ where: { id } });
  }
}
