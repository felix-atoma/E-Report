import { IsString, IsEnum, IsNumber, IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';

export class QuizOptionDto {
  @IsString() text: string;
  @IsBoolean() isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsString() text: string;
  @IsEnum(QuestionType) type: QuestionType;
  @IsOptional() @IsNumber() points?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QuizOptionDto) options?: QuizOptionDto[];
}
