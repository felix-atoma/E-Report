import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

enum TermSystemDto {
  TRIMESTRE = 'TRIMESTRE',
  SEMESTRE = 'SEMESTRE',
  CUSTOM = 'CUSTOM',
}

export class CreateReportDto {
  @ApiProperty({ description: 'UUID of the class' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: '2024-2025' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ enum: TermSystemDto })
  @IsEnum(TermSystemDto)
  termType: TermSystemDto;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  termNumber: number;

  @ApiPropertyOptional({ example: 'Trimestre 1' })
  @IsOptional()
  @IsString()
  termName?: string;
}
