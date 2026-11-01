import { PartialType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}
