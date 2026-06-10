import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IncidentCategory } from '@prisma/client';

export class CreateIncidentReportDto {
  @IsEnum(IncidentCategory)
  category: IncidentCategory;

  @IsString() @MinLength(5) @MaxLength(120)
  title: string;

  @IsString() @MinLength(20) @MaxLength(2000)
  description: string;

  @IsString() @MinLength(2) @MaxLength(100)
  accusedName: string;

  @IsString()
  accusedRole: string;

  @IsOptional() @IsBoolean()
  anonymous?: boolean;
}
