import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertStaffProfileDto {
  @IsOptional() @IsString() staffNumber?: string;
  @IsOptional() @IsDateString() employmentDate?: string;
  @IsOptional() @IsString() contractType?: string;
  @IsOptional() @IsString() qualification?: string;
  @IsOptional() @IsString() specialization?: string;
  @IsOptional() @IsInt() @Min(0) experienceYears?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() notes?: string;
}
