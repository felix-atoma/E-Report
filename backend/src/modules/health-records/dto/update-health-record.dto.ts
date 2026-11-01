import { PartialType } from '@nestjs/swagger';
import { CreateHealthRecordDto } from './create-health-record.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdateHealthRecordDto extends PartialType(CreateHealthRecordDto) {}
