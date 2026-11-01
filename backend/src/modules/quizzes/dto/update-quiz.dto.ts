import { PartialType } from '@nestjs/swagger';
import { CreateQuizDto } from './create-quiz.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdateQuizDto extends PartialType(CreateQuizDto) {}
