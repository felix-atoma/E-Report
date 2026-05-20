import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum MockExamType {
  BLANC = 'BLANC',
  CEPE  = 'CEPE',
  BEPC  = 'BEPC',
  BAC1  = 'BAC1',
  BAC2  = 'BAC2',
}

export class CreateMockExamDto {
  @IsString() @IsNotEmpty()
  classId: string;

  @IsString() @IsNotEmpty()
  academicYear: string;

  @IsEnum(MockExamType)
  examType: MockExamType;

  @IsString() @IsNotEmpty()
  label: string;

  @IsOptional() @IsDateString()
  examDate?: string;

  @IsOptional() @IsDateString()
  examEndDate?: string;
}
