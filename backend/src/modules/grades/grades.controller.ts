import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { BulkGradesDto } from './dto/bulk-grades.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('grades')
@ApiBearerAuth()
@Controller('grades')
export class GradesController {
  constructor(private readonly service: GradesService) {}

  @Get('report/:reportId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get all grades for a report card' })
  findByReport(@Param('reportId') reportId: string, @CurrentUser() user: any) {
    return this.service.findByReport(reportId, user.id, user.role);
  }

  @Put('report/:reportId/bulk')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Bulk upsert grades for a report card' })
  bulkUpsert(
    @Param('reportId') reportId: string,
    @Body() dto: BulkGradesDto,
    @CurrentUser() user: any,
  ) {
    return this.service.bulkUpsert(reportId, dto, user.id, user.role);
  }
}
