import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandingAssetDto {
  @ApiProperty({ example: 'logo', description: 'logo | crest | stamp | banner' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: 'https://cdn.example.com/logo.png' })
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'Logo principal' })
  @IsOptional()
  @IsString()
  label?: string;
}
