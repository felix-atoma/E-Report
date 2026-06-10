import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IncidentStatus } from '@prisma/client';

export class UpdateIncidentStatusDto {
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @IsOptional() @IsString() @MaxLength(2000)
  adminNotes?: string;
}
