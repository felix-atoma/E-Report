import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementDto } from './create-announcement.dto';

// Modification : mêmes champs que la création, tous facultatifs mais validés ; un champ inconnu
// (institutionId, createdById…) est refusé par le ValidationPipe global.
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
