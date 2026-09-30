import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceEntryDto {
  @IsString() studentId: string;
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
  // Durée du retard en minutes — utilisée uniquement quand status = LATE
  @IsOptional() @IsInt() @Min(1) @Max(600) minutesLate?: number;
  @IsOptional() @IsString() note?: string;
}

export class BulkAttendanceDto {
  @IsString() classId: string;
  @IsOptional() @IsString() subjectId?: string;
  // Heure de début de la séance, ex. "08:00"
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime?: string;
  @IsDateString() date: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
