import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HealthRecordsService } from './health-records.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('health-records')
export class HealthRecordsController {
  constructor(private readonly service: HealthRecordsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  list(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.service.list(user.institutionId, { search, type: type as any });
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER)
  listByStudent(@Param('studentId') studentId: string, @CurrentUser() user: any) {
    return this.service.listByStudent(studentId, user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateHealthRecordDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.name, user.sub);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateHealthRecordDto>,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }
}
