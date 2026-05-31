import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { TransferDirection } from '@prisma/client';

export class CreateTransferDto {
  @IsString()
  studentId: string;

  @IsEnum(TransferDirection)
  direction: TransferDirection;

  @IsString()
  otherSchool: string;

  @IsDateString()
  transferDate: string;

  @IsOptional() @IsString() academicYear?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() documentUrl?: string;
  @IsOptional() @IsString() notes?: string;
}
