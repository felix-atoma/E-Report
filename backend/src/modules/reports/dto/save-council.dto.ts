import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

class CouncilDecisionRowDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  studentId: string;

  /** Vide = revenir à la décision proposée selon le seuil de l'école */
  @IsOptional() @IsString() @MaxLength(200)
  decision?: string | null;
}

/** Validation du conseil de classe : une décision par élève */
export class SaveCouncilDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  classId: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  academicYear: string;

  @IsArray() @ArrayMaxSize(300)
  @ValidateNested({ each: true }) @Type(() => CouncilDecisionRowDto)
  decisions: CouncilDecisionRowDto[];
}
