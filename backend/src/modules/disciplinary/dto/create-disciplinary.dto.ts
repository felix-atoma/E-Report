import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DisciplinaryType } from '@prisma/client';

export class CreateDisciplinaryDto {
  @IsString() @IsNotEmpty() studentId: string;
  @IsDateString() date: string;
  @IsEnum(DisciplinaryType) type: DisciplinaryType;
  @IsString() @IsNotEmpty() description: string;

  @IsOptional() @IsString() sanction?: string;
  @IsOptional() @IsDateString() sanctionStart?: string;
  @IsOptional() @IsDateString() sanctionEnd?: string;
  @IsOptional() @IsBoolean() resolved?: boolean;
}
