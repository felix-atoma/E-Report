import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpsertSubjectHoursDto {
  @ApiProperty({ example: 'cls-uuid' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: '2024-2025' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  termNumber: number;

  @ApiPropertyOptional({ example: 'Trimestre 1' })
  @IsOptional()
  @IsString()
  termName?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  heuresPrevues?: number;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsInt()
  @Min(0)
  heuresEffectuees?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  absences?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  retards?: number;

  @ApiPropertyOptional({ example: 'Bon déroulement du trimestre.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
