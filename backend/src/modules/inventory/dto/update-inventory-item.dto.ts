import { PartialType } from '@nestjs/swagger';
import { CreateInventoryItemDto } from './create-inventory-item.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {}
