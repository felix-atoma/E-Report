import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Décision du conseil des professeurs (bulletin de la dernière période). Vide = revenir à la décision proposée. */
export class CouncilDecisionDto {
  @IsOptional() @IsString() @MaxLength(200)
  decision?: string | null;
}
