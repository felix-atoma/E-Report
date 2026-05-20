import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MockExamGradeEntryDto {
  @IsString() studentId: string;
  @IsString() subjectId: string;
  @IsOptional() @IsNumber() score?: number;
  @IsOptional() @IsNumber() coefficient?: number;
}

export class SaveMockExamGradesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MockExamGradeEntryDto)
  grades: MockExamGradeEntryDto[];
}
