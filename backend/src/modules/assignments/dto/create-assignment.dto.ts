import { IsString, IsOptional, IsNumber, IsDateString, IsInt } from 'class-validator';

export class CreateAssignmentDto {
  @IsString() title: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsNumber() maxScore?: number;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsString() classId: string;
  @IsString() subjectId: string;
  @IsString() academicYear: string;
  @IsOptional() @IsInt() termNumber?: number;
}
