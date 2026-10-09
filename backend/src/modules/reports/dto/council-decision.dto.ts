import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Décision du conseil de classe (bulletin annuel). `decision` vide = revenir à la décision proposée. */
export class CouncilDecisionDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  studentId: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  academicYear: string;

  @IsOptional() @IsString() @MaxLength(200)
  decision?: string | null;
}
