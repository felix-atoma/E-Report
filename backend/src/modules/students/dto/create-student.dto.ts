import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStudentDto {
  @ApiPropertyOptional({ example: 'LYC-2024-001', description: 'Auto-generated if omitted' })
  @IsOptional()
  @IsString()
  admissionNumber?: string;

  @ApiProperty({ example: 'Ama Kofi', description: 'Student full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2010-03-15', description: 'Date of birth (YYYY-MM-DD)' })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ enum: ['M', 'F'], description: 'M = Masculin, F = Féminin' })
  @IsOptional()
  @IsEnum(['M', 'F'])
  sex?: 'M' | 'F';

  @ApiPropertyOptional({ example: 'ama.kofi@parent.tg', description: 'Student email (creates linked user account)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'UUID of existing parent User account' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 'parent@example.tg', description: 'Parent email — looked up and linked automatically' })
  @IsOptional()
  @IsEmail()
  parentEmail?: string;

  @ApiPropertyOptional({ description: 'UUID of class to enroll the student in' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;
}
