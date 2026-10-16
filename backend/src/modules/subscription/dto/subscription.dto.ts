import { IsEnum, IsString, IsOptional, IsIn } from 'class-validator';

export class InitiateNotchpayDto {
  @IsIn(['TRIMESTER', 'SEMESTER'])
  plan: 'TRIMESTER' | 'SEMESTER';
}

export class SubmitMomoDto {
  @IsIn(['TRIMESTER', 'SEMESTER'])
  plan: 'TRIMESTER' | 'SEMESTER';

  @IsString()
  momoPhone: string;

  @IsString()
  momoReference: string;

  @IsIn(['TMONEY', 'FLOOZ', 'MOOV'])
  momoOperator: 'TMONEY' | 'FLOOZ' | 'MOOV';
}

export class RejectSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
