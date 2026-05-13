import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Sex } from '@prisma/client';

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'LYC-2024-001' })
  @IsOptional()
  @IsString()
  admissionNumber?: string;

  @ApiPropertyOptional({ example: '2010-03-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Sex })
  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @ApiPropertyOptional({ description: 'UUID of parent User account' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
