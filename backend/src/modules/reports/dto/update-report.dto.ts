import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

enum ConductRatingDto {
  TRES_BIEN = 'TRES_BIEN',
  BIEN = 'BIEN',
  PASSABLE = 'PASSABLE',
  MEDIOCRE = 'MEDIOCRE',
}

export class UpdateReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherComment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  principalComment?: string;

  @ApiPropertyOptional({ enum: ConductRatingDto })
  @IsOptional()
  @IsEnum(ConductRatingDto)
  conductRating?: ConductRatingDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attendanceDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attendancePresent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attendanceLate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attendanceAbsent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attendanceExcluded?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  warnings?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  commendations?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  honorCouncil?: boolean;
}
