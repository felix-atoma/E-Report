import { IsString, IsEnum, IsInt, IsOptional, Min, IsDateString, IsNumber, IsBoolean } from 'class-validator';
import { InventoryCategory, InventoryCondition } from '@prisma/client';

export class CreateInventoryItemDto {
  @IsString()
  name: string;

  @IsEnum(InventoryCategory)
  category: InventoryCategory;

  @IsOptional() @IsInt() @Min(0) quantity?: number;
  @IsOptional() @IsEnum(InventoryCondition) condition?: InventoryCondition;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsNumber() purchaseValue?: number;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
