import { IsString, IsInt, IsOptional, Min, Max, IsEmail } from 'class-validator';

export class UpsertAlumniDto {
  @IsString()
  studentId: string;

  @IsInt()
  @Min(1990)
  @Max(2100)
  graduationYear: number;

  @IsOptional() @IsString() lastClass?: string;
  @IsOptional() @IsString() diplomaNumber?: string;
  @IsOptional() @IsString() examType?: string;
  @IsOptional() @IsString() examSession?: string;
  @IsOptional() @IsString() examResult?: string;
  @IsOptional() @IsString() nationalExamCenter?: string;
  @IsOptional() @IsString() furtherEducation?: string;
  @IsOptional() @IsString() currentEmployer?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() notes?: string;
}
