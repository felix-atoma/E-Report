import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertGradeDto {
  @ApiProperty({ description: 'UUID of the subject' })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ example: 15.5, description: 'Score out of 20' })
  @IsNumber()
  @Min(0)
  @Max(20)
  score: number;

  @ApiProperty({ example: 3, description: 'Coefficient for this subject in this class' })
  @IsNumber()
  @Min(0.5)
  @Max(20)
  coefficient: number;

  @ApiPropertyOptional({ example: 'Bon travail' })
  @IsOptional()
  @IsString()
  teacherComment?: string;
}
