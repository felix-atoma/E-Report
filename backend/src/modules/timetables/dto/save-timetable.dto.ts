import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';

export class TimetableSlotDto {
  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  room?: string;
}

export class SaveTimetableDto {
  @ApiProperty()
  @IsString()
  academicYear: string;

  @ApiProperty({ type: [TimetableSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimetableSlotDto)
  slots: TimetableSlotDto[];
}
