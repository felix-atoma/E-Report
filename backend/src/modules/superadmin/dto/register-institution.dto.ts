import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  Min,
} from 'class-validator';

export class RegisterInstitutionDto {
  @IsString()
  schoolName: string;

  @IsString()
  city: string;

  @IsString()
  adminName: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  declaredStudentCount?: number;
}
