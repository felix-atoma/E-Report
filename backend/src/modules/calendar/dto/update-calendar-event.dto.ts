import { PartialType } from '@nestjs/swagger';
import { CreateCalendarEventDto } from './create-calendar-event.dto';

// Modification d'un événement : mêmes champs que la création, tous facultatifs, validés et filtrés
// (un champ inconnu comme institutionId est refusé par le ValidationPipe global).
export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {}
