import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { HealthRecordsService } from './health-records.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { HealthVisitType } from '@prisma/client';

@Controller('health-records')
export class HealthRecordsController {
  constructor(private readonly service: HealthRecordsService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  list(
    @Req() req,
    @Query('search') search?: string,
    @Query('type') type?: HealthVisitType,
  ) {
    return this.service.list(req.user.institutionId, { search, type });
  }

  @Get('student/:studentId')
  @Roles('ADMIN', 'TEACHER')
  listByStudent(@Param('studentId') studentId: string, @Req() req) {
    return this.service.listByStudent(studentId, req.user.institutionId);
  }

  @Post()
  @Roles('ADMIN', 'TEACHER')
  create(@Body() dto: CreateHealthRecordDto, @Req() req) {
    return this.service.create(dto, req.user.institutionId, req.user.name, req.user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TEACHER')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateHealthRecordDto>,
    @Req() req,
  ) {
    return this.service.update(id, dto, req.user.institutionId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.institutionId);
  }
}
