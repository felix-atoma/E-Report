import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Koffi Amevor' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+22890123456' })
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional({ enum: ['FR', 'EN'] })
  @IsOptional()
  @IsEnum(['FR', 'EN'])
  language?: 'FR' | 'EN';

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
