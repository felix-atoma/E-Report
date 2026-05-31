import { Body, Controller, Delete, Get, Param, Put, Req } from '@nestjs/common';
import { StaffProfilesService } from './staff-profiles.service';
import { UpsertStaffProfileDto } from './dto/upsert-staff-profile.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('staff-profiles')
export class StaffProfilesController {
  constructor(private readonly service: StaffProfilesService) {}

  @Get()
  @Roles(Role.ADMIN)
  list(@Req() req: any) {
    return this.service.list(req.user.institutionId);
  }

  @Get(':userId')
  @Roles(Role.ADMIN)
  get(@Param('userId') userId: string, @Req() req: any) {
    return this.service.get(userId, req.user.institutionId);
  }

  @Put(':userId')
  @Roles(Role.ADMIN)
  upsert(@Param('userId') userId: string, @Body() dto: UpsertStaffProfileDto, @Req() req: any) {
    return this.service.upsert(userId, dto, req.user.institutionId);
  }

  @Delete(':userId')
  @Roles(Role.ADMIN)
  remove(@Param('userId') userId: string, @Req() req: any) {
    return this.service.remove(userId, req.user.institutionId);
  }
}
