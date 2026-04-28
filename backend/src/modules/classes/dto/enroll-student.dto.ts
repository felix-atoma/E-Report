import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EnrollStudentDto {
  @ApiProperty({ description: 'UUID of the student to enroll' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: '2024-2025' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiPropertyOptional({ example: 'Trimestre 1' })
  @IsOptional()
  @IsString()
  term?: string;
}
