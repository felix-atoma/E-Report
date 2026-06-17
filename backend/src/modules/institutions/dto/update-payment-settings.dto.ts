import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePaymentSettingsDto {
  @ApiPropertyOptional({ description: "Notchpay public key (pk_test_... or pk_live_...), from the school's own Notchpay account" })
  @IsOptional()
  @IsString()
  notchpayPublicKey?: string;

  @ApiPropertyOptional({ description: "Notchpay webhook hash key, used to verify payment notifications. Write-only — never returned by GET." })
  @IsOptional()
  @IsString()
  notchpayHashKey?: string;
}
