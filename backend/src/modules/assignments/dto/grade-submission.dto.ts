import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber() score: number;
  @IsOptional() @IsString() feedback?: string;
}
