import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsString() questionId: string;
  @IsOptional() @IsString() selectedOptionId?: string;
  @IsOptional() @IsString() textAnswer?: string;
}

export class SubmitAttemptDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => AnswerDto) answers: AnswerDto[];
}
