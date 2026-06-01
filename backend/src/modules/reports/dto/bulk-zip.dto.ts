import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkZipDto {
  @IsString()
  academicYear: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  termNumber: number;

  @IsOptional()
  @IsString()
  classId?: string;
}
