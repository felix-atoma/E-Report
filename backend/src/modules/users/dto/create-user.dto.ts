import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Koffi Amevor' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'koffi@lycee-demo.tg' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: '+22890123456' })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional({ type: [String], description: 'Subject IDs to assign (teachers only)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectIds?: string[];

  @ApiPropertyOptional({ description: 'Class ID to set as professeur principal (teachers only)' })
  @IsOptional()
  @IsString()
  mainClassId?: string;
}
