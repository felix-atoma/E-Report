import { IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceEntryDto {
  @IsString() studentId: string;
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @IsOptional() @IsString() note?: string;
}

export class BulkAttendanceDto {
  @IsString() classId: string;
  @IsOptional() @IsString() subjectId?: string;
  @IsDateString() date: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
