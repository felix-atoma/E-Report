import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { NationalExamType, NationalExamResultStatus } from '@prisma/client';

export class UpsertExamResultDto {
  @IsString() studentId: string;
  @IsEnum(NationalExamType) examType: NationalExamType;
  @IsString() session: string;
  @IsString() academicYear: string;
  @IsEnum(NationalExamResultStatus) result: NationalExamResultStatus;
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsString() center?: string;
  @IsOptional() @IsString() series?: string;
  @IsOptional() @IsString() mention?: string;
  @IsOptional() @IsNumber() totalScore?: number;
  @IsOptional() @IsString() notes?: string;
}
