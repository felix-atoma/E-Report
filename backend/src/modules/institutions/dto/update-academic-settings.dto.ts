import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateAcademicSettingsDto {
  @ApiPropertyOptional({ enum: ['TRIMESTRE', 'SEMESTRE', 'CUSTOM'] })
  @IsOptional()
  @IsEnum(['TRIMESTRE', 'SEMESTRE', 'CUSTOM'])
  termSystem?: 'TRIMESTRE' | 'SEMESTRE' | 'CUSTOM';

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  defaultPassMark?: number;

  @ApiPropertyOptional({ example: 'XOF' })
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Whether the fee gate is enabled by default' })
  @IsOptional()
  feeGateEnabled?: boolean;
}
