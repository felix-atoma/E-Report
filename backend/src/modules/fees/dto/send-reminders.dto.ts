import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendRemindersDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true })
  studentIds: string[];

  @IsString() @IsNotEmpty() @MaxLength(20)
  academicYear: string;
}
