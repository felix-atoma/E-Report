import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TermDateDto {
  @IsInt() @Min(1) @Max(12)
  termNumber!: number;

  @IsDateString()
  start!: string; // "YYYY-MM-DD"

  @IsDateString()
  end!: string;
}

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

  @ApiPropertyOptional({ description: 'Dates de début/fin de chaque période — utilisées pour cumuler absences et retards' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermDateDto)
  termDates?: TermDateDto[];

  @ApiPropertyOptional({ enum: ['EQUAL', 'LAST_DOUBLE'], description: 'Moyenne annuelle : moyenne simple des périodes, ou dernière période comptée double' })
  @IsOptional()
  @IsEnum(['EQUAL', 'LAST_DOUBLE'])
  annualWeighting?: 'EQUAL' | 'LAST_DOUBLE';

  @ApiPropertyOptional({ example: 10, description: 'Moyenne annuelle (sur 20) à partir de laquelle le passage est proposé' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  promotionThreshold?: number;

  @ApiPropertyOptional({ example: '2027-09-13', description: "Rentrée de l'année scolaire suivante (AAAA-MM-JJ) — affichée sur les bulletins du dernier trimestre au primaire" })
  @IsOptional()
  @Matches(/^(\d{4}-\d{2}-\d{2})?$/, { message: 'Date au format AAAA-MM-JJ' })
  nextSchoolYearStart?: string;
}
