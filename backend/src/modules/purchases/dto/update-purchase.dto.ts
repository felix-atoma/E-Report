import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseDto } from './create-purchase.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdatePurchaseDto extends PartialType(CreatePurchaseDto) {}
