import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayInstalmentDto {
  @ApiProperty() @IsNumber() @IsPositive() paidAmount: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}
