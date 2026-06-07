import { IsEnum, IsString, IsOptional, IsIn } from 'class-validator';

export class InitiateNotchpayDto {
  @IsIn(['MONTHLY', 'ANNUAL'])
  plan: 'MONTHLY' | 'ANNUAL';
}

export class SubmitMomoDto {
  @IsIn(['MONTHLY', 'ANNUAL'])
  plan: 'MONTHLY' | 'ANNUAL';

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
