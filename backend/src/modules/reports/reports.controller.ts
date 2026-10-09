import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { TitulaireEntryDto } from './dto/titulaire-entry.dto';
import { BulkZipDto } from './dto/bulk-zip.dto';
import { CouncilDecisionDto } from './dto/council-decision.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('verify/:code')
  @Public()
  @ApiOperation({ summary: 'Public: verify bulletin authenticity by security code' })
  verifyByCode(@Param('code') code: string) {
    return this.service.verifyByCode(code);
  }

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

  // Déclarée avant @Get(':id') pour que « class-status » ne soit pas pris pour un identifiant
  @Get('class-status')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Signed grade sheets and bulletin counts for a class term' })
  classStatus(
    @CurrentUser() user: any,
    @Query('classId') classId: string,
    @Query('academicYear') academicYear: string,
    @Query('termNumber') termNumber: string,
  ) {
    return this.service.classStatus(classId, academicYear, Number(termNumber) || 1, user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a report card manually (Admin only — normally generated when all grade sheets are signed)' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.id);
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

  @Put('titulaire')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Bulk upsert titulaire fields (attendance, conduct, discipline) for a class term' })
  bulkTitulaireUpsert(@Body() dto: TitulaireEntryDto, @CurrentUser() user: any) {
    return this.service.bulkTitulaireUpsert(dto, user.institutionId, user.id, user.role);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish report card — class titulaire (or admin); triggers fee-gate delivery flow' })
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.publish(id, user.institutionId, user.id, user.role);
  }

  @Post(':id/ai-comment')
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suggest the titulaire's observation with AI (gender/number agreement from the student's sex)" })
  aiComment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.generateTitulaireComment(id, user.institutionId, user.id, user.role);
  }

  @Get('palmares')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get class rankings for published report cards' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'termName', required: false })
  getPalmares(
    @CurrentUser() user: any,
    @Query('classId') classId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('termName') termName?: string,
  ) {
    return this.service.palmares(user.institutionId, { classId, academicYear, termName });
  }

  @Get('annual')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Get annual report card aggregated across all terms' })
  @ApiQuery({ name: 'studentId', required: true })
  @ApiQuery({ name: 'academicYear', required: true })
  getAnnualReport(
    @Query('studentId') studentId: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getAnnualReport(studentId, academicYear, user.institutionId, user);
  }

  @Patch(':id/council-decision')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Décision du conseil des professeurs sur le bulletin de la dernière période (admin ou titulaire) ; vide = décision proposée' })
  setCouncilDecision(@Param('id') id: string, @Body() dto: CouncilDecisionDto, @CurrentUser() user: any) {
    return this.service.setCouncilDecision(id, dto.decision, user.institutionId, user.id, user.role);
  }

  // Après « palmares » et « annual » : déclarée avant, cette route les prenait pour un identifiant
  // de bulletin (« Report card not found ») — le bulletin annuel et le palmarès ne s'ouvraient pas.
  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Get a report card with all grades' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId, user.id, user.role);
  }

  @Post('bulk-publish')
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish all REVIEW bulletins for a class in one click (class titulaire or admin)' })
  bulkPublish(
    @Body() dto: { classId: string; academicYear: string; termNumber: number },
    @CurrentUser() user: any,
  ) {
    return this.service.bulkPublish(
      dto.classId, dto.academicYear, Number(dto.termNumber), user.institutionId, user.id, user.role,
    );
  }

  @Post('bulk-zip')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Download all published bulletins as a ZIP (by class or whole school)' })
  async bulkZip(@Body() dto: BulkZipDto, @CurrentUser() user: any, @Res() res: Response) {
    const buffer = await this.service.bulkZip(dto, user.institutionId);
    const scope = dto.classId ? 'classe' : 'ecole';
    const filename = `bulletins-${dto.academicYear}-T${dto.termNumber}-${scope}.zip`;
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':id/pdf')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate PDF for a published report card (Admin only)' })
  regeneratePdf(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.regeneratePdf(id, user.institutionId);
  }

  @Get(':id/pdf-download')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Download bulletin as PDF — generated on-demand (no stored file required)' })
  async downloadPdf(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const { buffer, filename } = await this.service.downloadPdf(id, user.institutionId, user.id, user.role);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
