import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('lms/announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get()
  list(@Req() req: any, @Query('classId') classId?: string) {
    return this.service.list(req.user.institutionId, req.user.id, req.user.role, classId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateAnnouncementDto, @Req() req: any) {
    return this.service.create(dto, req.user.institutionId, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(@Param('id') id: string, @Body() dto: Partial<CreateAnnouncementDto>, @Req() req: any) {
    return this.service.update(id, dto, req.user.institutionId, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.institutionId, req.user.id, req.user.role);
  }
}
