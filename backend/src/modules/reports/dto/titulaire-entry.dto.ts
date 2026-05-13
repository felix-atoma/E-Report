import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

enum TermSystemDto { TRIMESTRE = 'TRIMESTRE', SEMESTRE = 'SEMESTRE', CUSTOM = 'CUSTOM' }
enum ConductRatingDto { TRES_BIEN = 'TRES_BIEN', BIEN = 'BIEN', PASSABLE = 'PASSABLE', MEDIOCRE = 'MEDIOCRE' }

export class TitulaireStudentEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) attendanceDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) attendancePresent?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) attendanceLate?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) attendanceAbsent?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) attendanceExcluded?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) warnings?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) commendations?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()      honorCouncil?: boolean;
  @ApiPropertyOptional({ enum: ConductRatingDto }) @IsOptional() @IsEnum(ConductRatingDto) conductRating?: ConductRatingDto;
  @ApiPropertyOptional() @IsOptional() @IsString()       teacherComment?: string;
}

export class TitulaireEntryDto {
  @ApiProperty() @IsString() @IsNotEmpty() classId: string;
  @ApiProperty() @IsString() @IsNotEmpty() academicYear: string;
  @ApiProperty({ enum: TermSystemDto }) @IsEnum(TermSystemDto) termType: TermSystemDto;
  @ApiProperty() @IsInt() @Min(1) termNumber: number;
  @ApiPropertyOptional() @IsOptional() @IsString() termName?: string;

  @ApiProperty({ type: [TitulaireStudentEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TitulaireStudentEntryDto)
  entries: TitulaireStudentEntryDto[];
}
