import { Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Get notifications for the current user (parents/teachers)' })
  findMine(@CurrentUser() user: any) {
    return this.service.findForUser(user.id);
  }

  @Get('held')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'List all held (unpaid) notifications (Admin/Bursar)' })
  findHeld(@CurrentUser() user: any) {
    return this.service.findHeld(user.institutionId);
  }

  @Patch(':id/force-send')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-release a held notification regardless of fee status (Admin only)' })
  forceSend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.forceSend(id, user.institutionId);
  }
}
