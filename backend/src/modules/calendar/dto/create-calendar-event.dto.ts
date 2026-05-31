import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CalendarEventType } from '@prisma/client';

export class CreateCalendarEventDto {
  @IsString() @IsNotEmpty() title: string;
  @IsDateString() startDate: string;

  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() allDay?: boolean;
  @IsOptional() @IsEnum(CalendarEventType) type?: CalendarEventType;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() classId?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}
