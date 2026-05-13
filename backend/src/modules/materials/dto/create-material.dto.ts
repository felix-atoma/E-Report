import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { MaterialType } from '@prisma/client';

export class CreateMaterialDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(MaterialType) type: MaterialType;
  @IsString() url: string;
  @IsString() classId: string;
  @IsString() subjectId: string;
  @IsString() academicYear: string;
  @IsOptional() @IsInt() termNumber?: number;
}
