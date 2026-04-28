import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'List report cards (scoped by role)' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'termNumber', required: false, type: Number })
  findAll(
    @CurrentUser() user: any,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('termNumber') termNumber?: string,
  ) {
    return this.service.findAll(user.institutionId, user.id, user.role, {
      classId,
      studentId,
      academicYear,
      termNumber: termNumber ? Number(termNumber) : undefined,
    });
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Create a new report card (DRAFT status)' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Get a report card with all grades' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Update report card metadata (comments, conduct, attendance)' })
  update(@Param('id') id: string, @Body() dto: UpdateReportDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId, user.id, user.role);
  }

  @Patch(':id/submit')
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit report for review (DRAFT → REVIEW)' })
  submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.submit(id, user.institutionId, user.id, user.role);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish report card — triggers fee-gate delivery flow (Admin only)' })
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.publish(id, user.institutionId, user.id, user.role);
  }
}
