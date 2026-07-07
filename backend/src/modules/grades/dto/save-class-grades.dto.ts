import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class StudentGradeRowDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  noteInterro1?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  noteInterro2?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  noteInterro3?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  noteInterro4?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  noteDevoir?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  noteComposition?: number;

  @ApiPropertyOptional({ minimum: 0.5, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(20)
  coefficient?: number;  // ignored when subject.hasCoefficient === false

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherComment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherName?: string;
}

export class SaveClassGradesDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicYear!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termName!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(3)
  termNumber!: number;

  @ApiProperty({ type: [StudentGradeRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentGradeRowDto)
  grades!: StudentGradeRowDto[];
}
