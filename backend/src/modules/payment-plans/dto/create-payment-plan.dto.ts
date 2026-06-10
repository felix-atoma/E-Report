import { IsString, IsNumber, IsPositive, IsArray, IsDateString, IsOptional, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class InstalmentDto {
  @ApiProperty() @IsDateString() dueDate: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

export class CreatePaymentPlanDto {
  @ApiProperty() @IsString() studentId: string;
  @ApiProperty() @IsString() academicYear: string;
  @ApiProperty() @IsNumber() @IsPositive() totalAmount: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [InstalmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstalmentDto)
  instalments: InstalmentDto[];
}
