import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Sse,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEventPattern, interval, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuperAdminService } from './superadmin.service';
import { RegisterInstitutionDto } from './dto/register-institution.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('superadmin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Public endpoint — no JWT required
  @Public()
  @Post('register')
  registerInstitution(@Body() dto: RegisterInstitutionDto) {
    return this.superAdminService.registerInstitution(dto);
  }

  @Roles(Role.SUPERADMIN)
  @Get('institutions')
  listInstitutions() {
    return this.superAdminService.listInstitutions();
  }

  // Real-time SSE stream — superadmin receives instant alerts when a school registers
  @Roles(Role.SUPERADMIN)
  @Sse('events')
  sseEvents(): Observable<MessageEvent> {
    const registrations$ = fromEventPattern<any>(
      (handler) => this.eventEmitter.on('school.registered', handler),
      (handler) => this.eventEmitter.off('school.registered', handler),
    ).pipe(
      map((payload) => ({
        data: { type: 'school.registered', payload },
      } as MessageEvent)),
    );

    // Heartbeat every 25 s — keeps connection alive through Render's proxy
    const heartbeat$ = interval(25_000).pipe(
      map(() => ({ data: { type: 'heartbeat' } } as MessageEvent)),
    );

    return merge(registrations$, heartbeat$);
  }

  @Roles(Role.SUPERADMIN)
  @Patch('institutions/:id/approve')
  approveInstitution(@Param('id') id: string) {
    return this.superAdminService.approveInstitution(id);
  }

  @Roles(Role.SUPERADMIN)
  @Patch('institutions/:id/suspend')
  suspendInstitution(@Param('id') id: string) {
    return this.superAdminService.suspendInstitution(id);
  }

  @Roles(Role.SUPERADMIN)
  @Patch('institutions/:id/reject')
  rejectInstitution(@Param('id') id: string) {
    return this.superAdminService.rejectInstitution(id);
  }

  @Roles(Role.SUPERADMIN)
  @Patch('institutions/:id/notes')
  updateNotes(@Param('id') id: string, @Body('notes') notes: string) {
    return this.superAdminService.updateNotes(id, notes);
  }

  @Roles(Role.SUPERADMIN)
  @Patch('institutions/:id/plan')
  updateSubscriptionPlan(@Param('id') id: string, @Body('plan') plan: string) {
    return this.superAdminService.updateSubscriptionPlan(id, plan);
  }
}
