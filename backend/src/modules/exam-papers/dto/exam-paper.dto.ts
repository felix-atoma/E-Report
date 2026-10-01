import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ExamPaperKind {
  DEVOIR_SURVEILLE = 'DEVOIR_SURVEILLE',
  COMPOSITION_MENSUELLE = 'COMPOSITION_MENSUELLE',
  COMPOSITION_TRIMESTRIELLE = 'COMPOSITION_TRIMESTRIELLE',
  EXAMEN_BLANC = 'EXAMEN_BLANC',
}

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value);

/** Champs envoyés avec les fichiers (multipart) à la création d'une épreuve */
export class CreateExamPaperDto {
  @IsEnum(ExamPaperKind, { message: "Type d'épreuve invalide" })
  kind: ExamPaperKind;

  @Transform(emptyToUndefined) @IsOptional() @IsString()
  classId?: string;

  @Transform(emptyToUndefined) @IsOptional() @IsString()
  subjectId?: string;

  @IsString() @IsNotEmpty()
  academicYear: string;

  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(30)
  duration?: string;

  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(10)
  coefficient?: string;
}

export class UpdateExamPaperDto {
  @IsOptional() @IsEnum(ExamPaperKind, { message: "Type d'épreuve invalide" })
  kind?: ExamPaperKind;

  @IsOptional() @IsString()
  classId?: string;

  @IsOptional() @IsString()
  subjectId?: string;

  @IsOptional() @IsString() @MaxLength(20)
  academicYear?: string;

  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(30)
  duration?: string;

  @IsOptional() @IsString() @MaxLength(10)
  coefficient?: string;

  @IsOptional() @IsString() @MaxLength(400_000)
  content?: string;
}

export class ReturnExamPaperDto {
  @IsString() @IsNotEmpty({ message: 'Indiquez au professeur ce qu’il faut corriger' }) @MaxLength(2000)
  comment: string;
}
