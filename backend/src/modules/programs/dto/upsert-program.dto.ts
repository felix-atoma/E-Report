import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';

export class ChapterDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class UpsertProgramDto {
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChapterDto)
  chapters: ChapterDto[];
}
