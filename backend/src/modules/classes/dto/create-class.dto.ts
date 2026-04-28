import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ example: '6ème A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '6eme', description: 'Education level code' })
  @IsString()
  @IsNotEmpty()
  level: string;

  @ApiPropertyOptional({ example: 'D', description: 'Series (for Lycée)' })
  @IsOptional()
  @IsString()
  series?: string;

  @ApiPropertyOptional({ example: 'A', description: 'Section letter' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiProperty({ example: '2024-2025' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiPropertyOptional({ example: 'Salle 12' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'UUID of the class teacher' })
  @IsOptional()
  @IsString()
  teacherId?: string;
}
