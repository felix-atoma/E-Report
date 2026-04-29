import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathématiques' })
  @IsString()
  @IsNotEmpty()
  nameFr: string;

  @ApiPropertyOptional({ example: 'Mathematics', description: 'Defaults to nameFr if omitted' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ example: 'MATH', description: 'Auto-generated from nameFr if omitted' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Sciences exactes' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Sciences' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 10, description: 'Pass mark out of 20' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  passMark?: number;
}
