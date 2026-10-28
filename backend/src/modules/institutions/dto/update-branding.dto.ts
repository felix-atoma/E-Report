import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

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

  /** Cachet sur les bulletins : MANUAL (case vide, tampon à la main) ou DIGITAL (image du cachet, bulletins publiés) */
  @ApiPropertyOptional({ enum: ['MANUAL', 'DIGITAL'] }) @IsOptional() @IsIn(['MANUAL', 'DIGITAL']) stampMode?: 'MANUAL' | 'DIGITAL';

  /** Signature du directeur (image PNG en data URL) — chaîne vide pour la retirer */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1_500_000) directorSignature?: string;
  /** Nom imprimé sous la signature du directeur (ex. « M. KOFFI Mensah ») */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) directorName?: string;
  /** Deux cycles sous un même compte : nom et directeur du primaire (ceux ci-dessus = secondaire) */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1_500_000) directorSignaturePrimary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) directorNamePrimary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) schoolNamePrimary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) schoolNameSecondary?: string;

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
