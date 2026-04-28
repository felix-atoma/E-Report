import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignSubjectDto {
  @ApiProperty({ description: 'UUID of the subject' })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiPropertyOptional({ description: 'UUID of the teacher for this subject in this class' })
  @IsOptional()
  @IsString()
  teacherId?: string;
}
