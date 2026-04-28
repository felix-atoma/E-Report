import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  attendanceDays?: number;

  @ApiPropertyOptional({ example: 85 })
  @IsOptional()
  @IsInt()
  @Min(0)
  attendancePresent?: number;
}
