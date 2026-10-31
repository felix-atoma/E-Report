import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { EvaluationRemindersService } from './evaluation-reminders.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly service: CalendarService,
    private readonly reminders: EvaluationRemindersService,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.institutionId, req.user.role);
  }

  // Professeur : évaluations programmées et état réel de la saisie des notes sur ses fiches
  @Get('my-evaluations')
  @Roles(Role.TEACHER)
  myEvaluations(@Req() req: any) {
    return this.service.myEvaluations(req.user.institutionId, req.user.id);
  }

  // Admin : professeurs qui recevront demain matin le rappel « notes à saisir » (aucun message envoyé)
  @Get('evaluation-reminders/preview')
  @Roles(Role.ADMIN)
  previewReminders(@Req() req: any) {
    const tomorrow = new Date(Date.now() + 86400000);
    return this.reminders.run(req.user.institutionId, true, tomorrow);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateCalendarEventDto, @Req() req: any) {
    return this.service.create(dto, req.user.institutionId, req.user.id, req.user.role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(@Param('id') id: string, @Body() dto: Partial<CreateCalendarEventDto>, @Req() req: any) {
    return this.service.update(id, dto, req.user.institutionId, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.institutionId);
  }
}
