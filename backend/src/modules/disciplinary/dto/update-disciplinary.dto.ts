import { PartialType } from '@nestjs/swagger';
import { CreateDisciplinaryDto } from './create-disciplinary.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdateDisciplinaryDto extends PartialType(CreateDisciplinaryDto) {}
