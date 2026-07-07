import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

export class CreatePurchaseDto {
  @IsDateString()
  date: string;

  @IsString()
  itemName: string;

  @IsOptional() @IsString() model?: string;

  @IsNumber() @Min(0)
  price: number;

  @IsOptional() @IsString() notes?: string;
}
