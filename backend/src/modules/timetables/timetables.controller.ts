import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TimetablesService } from './timetables.service';
import { SaveTimetableDto } from './dto/save-timetable.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('timetables')
@ApiBearerAuth()
@Controller('timetables')
export class TimetablesController {
  constructor(private readonly service: TimetablesService) {}

  @Get('class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get timetable for a class' })
  @ApiQuery({ name: 'academicYear', required: true })
  findByClass(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findByClass(classId, academicYear, user.institutionId);
  }

  @Put('class/:classId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Save (replace) timetable for a class — admin only' })
  save(
    @Param('classId') classId: string,
    @Body() dto: SaveTimetableDto,
    @CurrentUser() user: any,
  ) {
    return this.service.save(classId, dto, user.institutionId);
  }
}
