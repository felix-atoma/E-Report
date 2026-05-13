import { IsString, IsOptional, IsInt, IsBoolean, IsDateString, IsUrl } from 'class-validator';

export class CreateQuizDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl() attachmentUrl?: string;
  @IsOptional() @IsInt() durationMinutes?: number;
  @IsOptional() @IsInt() maxAttempts?: number;
  @IsOptional() @IsDateString() openAt?: string;
  @IsOptional() @IsDateString() closeAt?: string;
  @IsOptional() @IsBoolean() showResults?: boolean;
  @IsString() classId: string;
  @IsString() subjectId: string;
  @IsString() academicYear: string;
  @IsOptional() @IsInt() termNumber?: number;
}
