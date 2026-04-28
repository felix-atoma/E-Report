import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin dashboard overview counts' })
  getOverview(@CurrentUser() user: any) {
    return this.service.getOverview(user.institutionId);
  }

  @Get('payment-summary')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Payment summary for an academic year' })
  @ApiQuery({ name: 'academicYear', required: true })
  getPaymentSummary(@CurrentUser() user: any, @Query('academicYear') academicYear: string) {
    return this.service.getPaymentSummary(user.institutionId, academicYear);
  }

  @Get('report-stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Report card status breakdown' })
  @ApiQuery({ name: 'academicYear', required: false })
  getReportStats(@CurrentUser() user: any, @Query('academicYear') academicYear?: string) {
    return this.service.getReportStats(user.institutionId, academicYear);
  }
}
