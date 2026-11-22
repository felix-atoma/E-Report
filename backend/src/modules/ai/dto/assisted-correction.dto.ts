import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CorrectionCriterionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  label: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  points: number;
}

export class AssistedCorrectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  maxPoints: number;

  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => CorrectionCriterionDto)
  criteria: CorrectionCriterionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  expectedAnswer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  acceptedVariants?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  responseText?: string;

  @IsOptional()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  imageMime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  imageBase64?: string;
}
