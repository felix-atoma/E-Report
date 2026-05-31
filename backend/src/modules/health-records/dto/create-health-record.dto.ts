import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { HealthVisitType } from '@prisma/client';

export class CreateHealthRecordDto {
  @IsString() studentId: string;
  @IsDateString() date: string;
  @IsOptional() @IsEnum(HealthVisitType) visitType?: HealthVisitType;
  @IsOptional() @IsString() complaint?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatment?: string;
  @IsOptional() @IsBoolean() referredToHospital?: boolean;
  @IsOptional() @IsString() hospital?: string;
  @IsOptional() @IsString() attendedByName?: string;
  @IsOptional() @IsString() notes?: string;
}
