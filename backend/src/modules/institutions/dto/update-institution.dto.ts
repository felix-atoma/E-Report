import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateInstitutionDto {
  @ApiPropertyOptional({ example: 'Lycée de Lomé' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'République Togolaise' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Travail · Liberté · Patrie' })
  @IsOptional()
  @IsString()
  countryMotto?: string;

  @ApiPropertyOptional({ example: '12 Rue des Écoles, Lomé' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+22822123456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@lycee-lome.tg' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://lycee-lome.tg' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 'Excellence et Savoir' })
  @IsOptional()
  @IsString()
  motto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  missionStatement?: string;

  @ApiPropertyOptional({ example: 'Inspection de l\'Enseignement du 1er Degré de Lomé-Commune' })
  @IsOptional()
  @IsString()
  circonscription?: string;
}
