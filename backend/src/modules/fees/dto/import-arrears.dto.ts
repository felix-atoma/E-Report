import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

class ArrearsRowDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  admissionNumber: string;

  @Type(() => Number) @IsNumber() @Min(0)
  amount: number;

  @IsOptional() @IsString() @MaxLength(200)
  note?: string;
}

/** Soldes antérieurs (arriérés) à reprendre : une ligne par élève, identifié par son matricule */
export class ImportArrearsDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  academicYear: string;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3000)
  @ValidateNested({ each: true }) @Type(() => ArrearsRowDto)
  rows: ArrearsRowDto[];
}
