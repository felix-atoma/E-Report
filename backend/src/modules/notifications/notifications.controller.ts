import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get notifications for the current user' })
  findMine(@CurrentUser() user: any) {
    return this.service.findForUser(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  unreadCount(@CurrentUser() user: any) {
    return this.service.unreadCount(user.id);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: any) {
    return this.service.markAllRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.markRead(id, user.id);
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

  @Post(':id/send-payment-link')
  @Roles(Role.ADMIN, Role.BURSAR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send WhatsApp payment reminder with amount due to parent' })
  sendPaymentLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.sendPaymentLink(id, user.institutionId);
  }
}
