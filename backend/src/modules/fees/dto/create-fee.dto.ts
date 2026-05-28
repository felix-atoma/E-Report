import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

enum FeeTypeDto {
  TUITION = 'TUITION',
  REGISTRATION = 'REGISTRATION',
  EXAM = 'EXAM',
  CANTEEN = 'CANTEEN',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER',
}

export class CreateFeeDto {
  @ApiProperty({ example: 'Frais de scolarité T1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: FeeTypeDto, default: 'TUITION' })
  @IsOptional()
  @IsEnum(FeeTypeDto)
  feeType?: FeeTypeDto;

  @ApiProperty({ example: 75000, description: 'Amount in FCFA' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'XOF', default: 'XOF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2024-2025' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ example: 'Trimestre 1' })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({ example: '6eme', description: 'Education level this fee applies to' })
  @IsOptional()
  @IsString()
  appliesToLevel?: string;

  @ApiPropertyOptional({ description: 'UUID of a specific class this fee applies to' })
  @IsOptional()
  @IsString()
  appliesToClassId?: string;
}
