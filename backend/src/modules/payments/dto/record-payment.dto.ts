import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

enum PaymentMethodDto {
  MOBILE_MONEY_TMONEY = 'MOBILE_MONEY_TMONEY',
  MOBILE_MONEY_FLOOZ = 'MOBILE_MONEY_FLOOZ',
  MOBILE_MONEY_MOMO = 'MOBILE_MONEY_MOMO',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'UUID of the student' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: 75000, description: 'Amount paid in FCFA' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: PaymentMethodDto })
  @IsEnum(PaymentMethodDto)
  paymentMethod: PaymentMethodDto;

  @ApiPropertyOptional({ example: '2024-2025' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ example: 'Trimestre 1' })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({ example: 'TXN-12345', description: 'Mobile money or bank reference' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: '2024-10-15', description: 'Payment date (defaults to today)' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
