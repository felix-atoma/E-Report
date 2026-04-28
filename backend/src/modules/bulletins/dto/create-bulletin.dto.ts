import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBulletinDto {
  @ApiProperty({ example: 'Réunion des parents — 15 novembre' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Une réunion des parents est prévue le 15 novembre à 17h en salle polyvalente.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'ANNOUNCEMENT', description: 'ANNOUNCEMENT | NOTICE | CIRCULAR | EVENT' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'ALL', description: 'ALL | CLASS | STUDENT | PARENT' })
  @IsString()
  @IsNotEmpty()
  targetAudience: string;

  @ApiPropertyOptional({ description: 'UUID of the target class or student (when targetAudience is CLASS or STUDENT)' })
  @IsOptional()
  @IsString()
  targetId?: string;
}
