import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export enum MockExamType {
  BLANC = 'BLANC',
  CEPE  = 'CEPE',
  BEPC  = 'BEPC',
  BAC1  = 'BAC1',
  BAC2  = 'BAC2',
  // Mêmes valeurs que l'enum Prisma MockExamType
  DEVOIR_SURVEILLE      = 'DEVOIR_SURVEILLE',       // devoirs surveillés (6ème → Terminale)
  COMPOSITION_MENSUELLE = 'COMPOSITION_MENSUELLE',  // compositions mensuelles (CI → CM2)
}

/** Date laissée vide dans le formulaire ("") : traitée comme absente au lieu d'être refusée. */
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value);

export class CreateMockExamDto {
  @IsString() @IsNotEmpty()
  classId: string;

  @IsString() @IsNotEmpty()
  academicYear: string;

  @IsEnum(MockExamType, { message: 'Type de session invalide' })
  examType: MockExamType;

  @IsString() @IsNotEmpty()
  label: string;

  @Transform(emptyToUndefined)
  @IsOptional() @IsDateString()
  examDate?: string;

  @Transform(emptyToUndefined)
  @IsOptional() @IsDateString()
  examEndDate?: string;
}
