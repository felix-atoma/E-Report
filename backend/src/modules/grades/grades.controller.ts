import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { BulkGradesDto } from './dto/bulk-grades.dto';
import { SaveClassGradesDto } from './dto/save-class-grades.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('grades')
@ApiBearerAuth()
@Controller('grades')
export class GradesController {
  constructor(private readonly service: GradesService) {}

  // ─── Existing: per report card ───────────────────────────────────────────

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

  // ─── NEW: fiche de notes — class × subject ───────────────────────────────

  @Get('class/:classId/subject/:subjectId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get fiche de notes for a subject in a class (all students)' })
  getForClassSubject(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Query('academicYear') academicYear: string,
    @Query('termNumber') termNumber: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getForClassSubject(
      classId,
      subjectId,
      academicYear,
      parseInt(termNumber, 10),
      user.id,
      user.role,
    );
  }

  @Put('class/:classId/subject/:subjectId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Save fiche de notes for a subject in a class (all students)' })
  saveForClassSubject(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: SaveClassGradesDto,
    @CurrentUser() user: any,
  ) {
    return this.service.saveForClassSubject(classId, subjectId, dto, user.id, user.role);
  }

  @Get('class/:classId/fiches')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BURSAR)
  @ApiOperation({ summary: 'Get all fiche signature statuses for a class/term' })
  listFiches(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear: string,
    @Query('termNumber') termNumber: string,
    @CurrentUser() user: any,
  ) {
    return this.service.listFiches(classId, academicYear, parseInt(termNumber, 10), user.id, user.role);
  }

  @Post('class/:classId/subject/:subjectId/sign')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Teacher signs and locks their fiche de notes' })
  signFiche(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Query('academicYear') academicYear: string,
    @Query('termNumber') termNumber: string,
    @Body() body: { signatureData?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.signFiche(
      classId, subjectId, academicYear, parseInt(termNumber, 10),
      user.id, user.role, body?.signatureData,
    );
  }

  @Post('class/:classId/subject/:subjectId/import-csv')
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(200)
  @ApiOperation({ summary: 'Import grades from CSV rows (array of {studentId, devoir, compo})' })
  importCsv(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Query('academicYear') academicYear: string,
    @Query('termNumber') termNumber: string,
    @Body() body: { rows: { studentId: string; devoir?: number; compo?: number }[] },
    @CurrentUser() user: any,
  ) {
    return this.service.importCsvGrades(
      classId, subjectId, academicYear, parseInt(termNumber, 10),
      body.rows, user.id, user.role,
    );
  }

  @Delete('class/:classId/subject/:subjectId/sign')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Retract signature (unsign) — only allowed before publish' })
  unsignFiche(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Query('academicYear') academicYear: string,
    @Query('termNumber') termNumber: string,
    @CurrentUser() user: any,
  ) {
    return this.service.unsignFiche(classId, subjectId, academicYear, parseInt(termNumber, 10), user.id, user.role);
  }
}
