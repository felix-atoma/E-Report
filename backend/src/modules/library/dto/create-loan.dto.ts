import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateLoanDto {
  @IsString() itemId: string;
  @IsOptional() @IsString() studentId?: string;
  @IsOptional() @IsString() borrowerName?: string;
  @IsDateString() loanDate: string;
  @IsDateString() dueDate: string;
  @IsOptional() @IsString() conditionOut?: string;
  @IsOptional() @IsString() notes?: string;
}
