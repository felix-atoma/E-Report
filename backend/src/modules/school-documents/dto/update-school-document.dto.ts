import { PartialType } from '@nestjs/swagger';
import { CreateSchoolDocumentDto } from './create-school-document.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdateSchoolDocumentDto extends PartialType(CreateSchoolDocumentDto) {}
