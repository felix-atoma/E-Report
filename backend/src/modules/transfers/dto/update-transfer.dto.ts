import { PartialType } from '@nestjs/swagger';
import { CreateTransferDto } from './create-transfer.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdateTransferDto extends PartialType(CreateTransferDto) {}
