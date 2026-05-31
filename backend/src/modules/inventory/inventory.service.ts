import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { InventoryCategory, InventoryCondition } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    institutionId: string,
    params?: { category?: InventoryCategory; condition?: InventoryCondition; search?: string; isActive?: boolean },
  ) {
    const where: any = { institutionId };
    if (params?.category) where.category = params.category;
    if (params?.condition) where.condition = params.condition;
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { location: { contains: params.search, mode: 'insensitive' } },
        { serialNumber: { contains: params.search, mode: 'insensitive' } },
        { supplier: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.inventoryItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async summary(institutionId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { institutionId, isActive: true },
      select: { category: true, quantity: true, condition: true, purchaseValue: true },
    });
    const byCategory: Record<string, { count: number; totalQty: number }> = {};
    let totalValue = 0;
    let totalItems = 0;
    for (const item of items) {
      if (!byCategory[item.category]) byCategory[item.category] = { count: 0, totalQty: 0 };
      byCategory[item.category].count += 1;
      byCategory[item.category].totalQty += item.quantity;
      totalItems += item.quantity;
      if (item.purchaseValue) totalValue += item.purchaseValue * item.quantity;
    }
    return { byCategory, totalItems, totalValue };
  }

  async create(dto: CreateInventoryItemDto, institutionId: string) {
    return this.prisma.inventoryItem.create({
      data: {
        institutionId,
        name: dto.name,
        category: dto.category,
        quantity: dto.quantity ?? 1,
        condition: dto.condition ?? 'GOOD',
        location: dto.location,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchaseValue: dto.purchaseValue,
        supplier: dto.supplier,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: Partial<CreateInventoryItemDto>, institutionId: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, institutionId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.condition !== undefined && { condition: dto.condition }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.serialNumber !== undefined && { serialNumber: dto.serialNumber }),
        ...(dto.purchaseDate !== undefined && { purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null }),
        ...(dto.purchaseValue !== undefined && { purchaseValue: dto.purchaseValue }),
        ...(dto.supplier !== undefined && { supplier: dto.supplier }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, institutionId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return this.prisma.inventoryItem.delete({ where: { id } });
  }
}
