import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { AlumniService } from './alumni.service';
import { UpsertAlumniDto } from './dto/upsert-alumni.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('alumni')
export class AlumniController {
  constructor(private readonly service: AlumniService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  list(@Req() req, @Query('year') year?: string, @Query('search') search?: string) {
    return this.service.list(req.user.institutionId, {
      year: year ? parseInt(year, 10) : undefined,
      search,
    });
  }

  @Post()
  @Roles('ADMIN')
  upsert(@Body() dto: UpsertAlumniDto, @Req() req) {
    return this.service.upsert(dto, req.user.institutionId);
  }

  @Get(':studentId')
  @Roles('ADMIN', 'TEACHER')
  findByStudent(@Param('studentId') studentId: string, @Req() req) {
    return this.service.findByStudent(studentId, req.user.institutionId);
  }

  @Delete(':studentId')
  @Roles('ADMIN')
  remove(@Param('studentId') studentId: string, @Req() req) {
    return this.service.remove(studentId, req.user.institutionId);
  }
}
