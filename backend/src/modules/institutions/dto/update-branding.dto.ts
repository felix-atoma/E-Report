import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateBrandingDto {
  @ApiPropertyOptional({ description: 'URL to institution logo' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'URL to institution crest' })
  @IsOptional()
  @IsString()
  crest?: string;

  @ApiPropertyOptional({ description: 'URL to institution stamp' })
  @IsOptional()
  @IsString()
  stamp?: string;

  @ApiPropertyOptional({ description: 'Branding config (colors, fonts, etc.)' })
  @IsOptional()
  @IsObject()
  brandingSettings?: Record<string, any>;
}
