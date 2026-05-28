import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateBrandingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() crest?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stamp?: string;

  // Sent by BrandingPage as top-level fields
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() faviconUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() secondaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() schoolMotto?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() circonscription?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() bulletinFontFamily?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bulletinFontSize?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() bulletinH1Size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bulletinH1Weight?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bulletinH2Size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bulletinH2Weight?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bulletinH3Size?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bulletinH3Weight?: string;

  @ApiPropertyOptional({ description: 'Arbitrary branding config (colors, fonts, etc.)' })
  @IsOptional()
  @IsObject()
  brandingSettings?: Record<string, any>;
}
