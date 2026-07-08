import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TermSystemByCycleDto {
  @IsOptional()
  @IsEnum(['TRIMESTRE', 'SEMESTRE', 'CUSTOM'])
  PRIMAIRE?: string;

  @IsOptional()
  @IsEnum(['TRIMESTRE', 'SEMESTRE', 'CUSTOM'])
  COLLEGE?: string;

  @IsOptional()
  @IsEnum(['TRIMESTRE', 'SEMESTRE', 'CUSTOM'])
  LYCEE?: string;
}

export class UpdateAcademicSettingsDto {
  @ApiPropertyOptional({ example: '2024-2025' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ enum: ['TRIMESTRE', 'SEMESTRE', 'CUSTOM'] })
  @IsOptional()
  @IsEnum(['TRIMESTRE', 'SEMESTRE', 'CUSTOM'])
  termType?: 'TRIMESTRE' | 'SEMESTRE' | 'CUSTOM';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  currentTerm?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passMark?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ example: 'XOF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  feeGateEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Per-cycle term system override for complex schools' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TermSystemByCycleDto)
  termSystemByCycle?: TermSystemByCycleDto;
}
