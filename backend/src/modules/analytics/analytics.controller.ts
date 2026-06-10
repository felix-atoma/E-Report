import { Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Payment summary for an academic year (defaults to current year)' })
  @ApiQuery({ name: 'academicYear', required: false })
  getPaymentSummary(@CurrentUser() user: any, @Query('academicYear') academicYear?: string) {
    return this.service.getPaymentSummary(user.institutionId, academicYear);
  }

  @Get('report-stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Report card status breakdown' })
  @ApiQuery({ name: 'academicYear', required: false })
  getReportStats(@CurrentUser() user: any, @Query('academicYear') academicYear?: string) {
    return this.service.getReportStats(user.institutionId, academicYear);
  }

  @Get('at-risk')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Students whose average dropped >1.5 points or are now failing' })
  @ApiQuery({ name: 'academicYear', required: false })
  getAtRisk(@CurrentUser() user: any, @Query('academicYear') academicYear?: string) {
    return this.service.getAtRiskStudents(user.institutionId, academicYear);
  }

  @Post('remind-unpaid')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Send WhatsApp payment reminders to parents with unpaid/partial fees' })
  @ApiQuery({ name: 'academicYear', required: false })
  remindUnpaid(@CurrentUser() user: any, @Query('academicYear') academicYear?: string) {
    return this.service.remindUnpaid(user.institutionId, academicYear);
  }

  @Get('records-summary')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'School-database module summary counts' })
  getRecordsSummary(@CurrentUser() user: any) {
    return this.service.getRecordsSummary(user.institutionId);
  }

  @Get('class-stats')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Class progress statistics compared to previous term' })
  @ApiQuery({ name: 'classId', required: true })
  @ApiQuery({ name: 'academicYear', required: true })
  @ApiQuery({ name: 'termNumber', required: true })
  getClassStats(
    @CurrentUser() user: any,
    @Query('classId') classId: string,
    @Query('academicYear') academicYear: string,
    @Query('termNumber') termNumber: string,
  ) {
    const term = parseInt(termNumber, 10);
    if (!classId || !academicYear || isNaN(term)) throw new BadRequestException('classId, academicYear et termNumber sont requis');
    return this.service.getClassStats(user.institutionId, classId, academicYear, term);
  }
}
