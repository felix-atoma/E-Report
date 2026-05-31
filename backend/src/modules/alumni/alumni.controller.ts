import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { AlumniService } from './alumni.service';
import { UpsertAlumniDto } from './dto/upsert-alumni.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('alumni')
export class AlumniController {
  constructor(private readonly service: AlumniService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  list(
    @CurrentUser() user: any,
    @Query('year') year?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user.institutionId, {
      year: year ? parseInt(year, 10) : undefined,
      search,
    });
  }

  @Post()
  @Roles(Role.ADMIN)
  upsert(@Body() dto: UpsertAlumniDto, @CurrentUser() user: any) {
    return this.service.upsert(dto, user.institutionId);
  }

  @Get(':studentId')
  @Roles(Role.ADMIN, Role.TEACHER)
  findByStudent(@Param('studentId') studentId: string, @CurrentUser() user: any) {
    return this.service.findByStudent(studentId, user.institutionId);
  }

  @Delete(':studentId')
  @Roles(Role.ADMIN)
  remove(@Param('studentId') studentId: string, @CurrentUser() user: any) {
    return this.service.remove(studentId, user.institutionId);
  }
}
