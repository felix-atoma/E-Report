import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, Res, UseGuards, BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
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
  async create(@Body() dto: CreateMockExamDto, @Req() req: any) {
    await this.service.assertCanManage({ examType: dto.examType }, req.user.role, req.user.institutionId);
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
  async updateType(
    @Param('id') id: string,
    @Body() body: { examType: string },
    @Req() req: any,
  ) {
    // Ni transformer un devoir surveillé, ni en créer un en changeant le type
    await this.service.assertCanManage(id, req.user.role, req.user.institutionId);
    await this.service.assertCanManage({ examType: body.examType }, req.user.role, req.user.institutionId);
    return this.service.updateType(id, req.user.institutionId, body.examType);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/dates')
  async updateDates(
    @Param('id') id: string,
    @Body() body: { examDate?: string | null; examEndDate?: string | null },
    @Req() req: any,
  ) {
    await this.service.assertCanManage(id, req.user.role, req.user.institutionId);
    return this.service.updateDates(id, req.user.institutionId, body.examDate, body.examEndDate);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/publish')
  async publish(@Param('id') id: string, @Req() req: any) {
    await this.service.assertCanManage(id, req.user.role, req.user.institutionId);
    return this.service.publish(id, req.user.institutionId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch(':id/unpublish')
  async unpublish(@Param('id') id: string, @Req() req: any) {
    await this.service.assertCanManage(id, req.user.role, req.user.institutionId);
    return this.service.unpublish(id, req.user.institutionId);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.service.assertCanManage(id, req.user.role, req.user.institutionId);
    return this.service.delete(id, req.user.institutionId);
  }

  // Relevé d'un élève en PDF — même charte que le bulletin (filigrane, une page)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id/releve/pdf')
  async relevePdf(
    @Param('id') id: string,
    @Query('studentId') studentId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!studentId) throw new BadRequestException('studentId requis');
    const { buffer, filename } = await this.service.relevePdf(id, req.user.institutionId, studentId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // Tous les relevés de la session dans un ZIP (un PDF par élève)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Get(':id/releve/zip')
  async releveZip(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const { buffer, filename } = await this.service.releveZip(id, req.user.institutionId);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
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
