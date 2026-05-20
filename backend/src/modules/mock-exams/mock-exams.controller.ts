import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { MockExamsService } from './mock-exams.service';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { SaveMockExamGradesDto } from './dto/save-grades.dto';

@Controller('mock-exams')
export class MockExamsController {
  constructor(private readonly service: MockExamsService) {}

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get()
  list(
    @Req() req: any,
    @Query('classId') classId?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.list(req.user.institutionId, classId, academicYear);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post()
  create(@Body() dto: CreateMockExamDto, @Req() req: any) {
    return this.service.create(dto, req.user.id, req.user.institutionId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id/grade-sheet')
  getGradeSheet(@Param('id') id: string, @Req() req: any) {
    return this.service.getGradeSheet(id, req.user.institutionId, req.user.id, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id/palmares')
  getPalmares(@Param('id') id: string, @Req() req: any) {
    return this.service.getPalmares(id, req.user.institutionId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id/fiche')
  getFicheData(@Param('id') id: string, @Req() req: any) {
    return this.service.getFicheData(id, req.user.institutionId, req.user.id, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/fiche/:subjectId')
  saveSubjectGrades(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @Body() body: { grades: { studentId: string; score: number | null }[]; coefficient?: number },
    @Req() req: any,
  ) {
    return this.service.saveSubjectGrades(id, subjectId, body.grades, req.user.institutionId, body.coefficient ?? 1, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Post(':id/fiche/:subjectId/sign')
  signSubjectFiche(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @Req() req: any,
  ) {
    return this.service.signSubjectFiche(id, subjectId, req.user.institutionId, req.user.id, req.user.name);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id/fiche/:subjectId/sign')
  unsignSubjectFiche(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @Req() req: any,
  ) {
    return this.service.unsignSubjectFiche(id, subjectId, req.user.institutionId, req.user.id, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/grades')
  saveGrades(
    @Param('id') id: string,
    @Body() dto: SaveMockExamGradesDto,
    @Req() req: any,
  ) {
    return this.service.saveGrades(id, dto, req.user.institutionId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/type')
  updateType(
    @Param('id') id: string,
    @Body() body: { examType: string },
    @Req() req: any,
  ) {
    return this.service.updateType(id, req.user.institutionId, body.examType);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/dates')
  updateDates(
    @Param('id') id: string,
    @Body() body: { examDate?: string | null; examEndDate?: string | null },
    @Req() req: any,
  ) {
    return this.service.updateDates(id, req.user.institutionId, body.examDate, body.examEndDate);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/publish')
  publish(@Param('id') id: string, @Req() req: any) {
    return this.service.publish(id, req.user.institutionId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/unpublish')
  unpublish(@Param('id') id: string, @Req() req: any) {
    return this.service.unpublish(id, req.user.institutionId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user.institutionId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id/releve')
  getReleve(
    @Param('id') id: string,
    @Req() req: any,
    @Query('studentId') studentId?: string,
  ) {
    return this.service.getReleve(id, req.user.institutionId, studentId);
  }
}
