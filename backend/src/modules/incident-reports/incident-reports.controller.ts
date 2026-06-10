import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IncidentReportsService } from './incident-reports.service';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-report.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('incident-reports')
@ApiBearerAuth()
@Controller('incident-reports')
export class IncidentReportsController {
  constructor(private readonly service: IncidentReportsService) {}

  @Post()
  @Roles(Role.STUDENT, Role.TEACHER)
  @ApiOperation({ summary: 'File an incident report (student or teacher)' })
  create(@Body() dto: CreateIncidentReportDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all incident reports (admin only)' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.service.findAll(user.institutionId, status, category);
  }

  @Get('mine')
  @Roles(Role.STUDENT, Role.TEACHER)
  @ApiOperation({ summary: 'List own incident reports' })
  findMine(@CurrentUser() user: any) {
    return this.service.findMine(user.institutionId, user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STUDENT, Role.TEACHER)
  @ApiOperation({ summary: 'Get one incident report' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId, user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update incident status and add admin notes (admin only)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateIncidentStatusDto, @CurrentUser() user: any) {
    return this.service.updateStatus(id, user.institutionId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an incident report (admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }
}
