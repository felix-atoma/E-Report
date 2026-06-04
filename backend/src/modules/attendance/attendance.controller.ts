import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('bulk')
  @Roles(Role.ADMIN, Role.TEACHER)
  bulkUpsert(@Body() dto: BulkAttendanceDto, @Req() req: any) {
    return this.service.bulkUpsert(dto, req.user.institutionId, req.user.name ?? req.user.email);
  }

  @Get('class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  listByClass(
    @Param('classId') classId: string,
    @Req() req: any,
    @Query('date') date?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.service.listByClass(classId, req.user.institutionId, date, subjectId);
  }

  @Get('class/:classId/summary')
  @Roles(Role.ADMIN, Role.TEACHER)
  summary(
    @Param('classId') classId: string,
    @Req() req: any,
    @Query('academicYear') academicYear: string,
  ) {
    return this.service.summary(classId, req.user.institutionId, academicYear);
  }

  @Get('student/:studentId')
  listByStudent(@Param('studentId') studentId: string, @Req() req: any) {
    return this.service.listByStudent(studentId, req.user.institutionId, req.user.role, req.user.id);
  }

  // Parent submits a justification for their child's absence
  @Patch(':id/justify')
  @Roles(Role.PARENT)
  justifyAbsence(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.service.justifyAbsence(id, reason, req.user.id, req.user.institutionId);
  }

  // Admin/Teacher approves a pending justification → marks EXCUSED
  @Patch(':id/approve-justification')
  @Roles(Role.ADMIN, Role.TEACHER)
  approveJustification(@Param('id') id: string, @Req() req: any) {
    return this.service.approveJustification(id, req.user.institutionId);
  }

  // List pending justifications (ABSENT with justification note) for the institution
  @Get('pending-justifications')
  @Roles(Role.ADMIN, Role.TEACHER)
  pendingJustifications(@Req() req: any) {
    return this.service.pendingJustifications(req.user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.institutionId);
  }
}
