import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Numéro du parent saisi depuis la situation des paiements (pour les rappels SMS / WhatsApp). */
export class ParentPhoneDto {
  @IsString() @IsNotEmpty() @MaxLength(30)
  phone: string;

  @IsIn(['FATHER', 'MOTHER'])
  who: 'FATHER' | 'MOTHER';

  @IsOptional() @IsString() @MaxLength(120)
  name?: string;
}
