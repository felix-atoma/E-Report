import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { IsArray, IsString } from 'class-validator';

class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.BURSAR)   // l’économe assigne les cotisations par classe
  @ApiOperation({ summary: 'List all active classes in the institution' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.institutionId, user.id, user.role);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new class (Admin only)' })
  create(@Body() dto: CreateClassDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get a class with its students and subjects' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId, user.id, user.role);
  }

  @Get(':id/list-pdf')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Liste de classe en PDF (élèves A-Z, colonnes vides au choix)' })
  async classListPdf(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
    @Query('extra') extra?: string,
    @Query('title') title?: string,
  ) {
    const { buffer, filename } = await this.service.classListPdf(id, user.institutionId, user.id, user.role, Number(extra ?? 5), title ?? '');
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.end(buffer);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a class (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateClassDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a class (Admin only)' })
  deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deactivate(id, user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a class (Admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }

  @Post('bulk-delete')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete classes (Admin only)' })
  bulkRemove(@Body() dto: BulkDeleteDto, @CurrentUser() user: any) {
    return this.service.bulkRemove(dto.ids, user.institutionId);
  }

  @Post(':id/enroll')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Enroll a student in this class (Admin only)' })
  enrollStudent(@Param('id') id: string, @Body() dto: EnrollStudentDto, @CurrentUser() user: any) {
    return this.service.enrollStudent(id, dto, user.institutionId);
  }

  @Delete(':id/students/:studentId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unenroll a student from this class (Admin only)' })
  unenrollStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.unenrollStudent(id, studentId, user.institutionId);
  }

  @Post(':id/subjects')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign a subject to this class (Admin only)' })
  assignSubject(@Param('id') id: string, @Body() dto: AssignSubjectDto, @CurrentUser() user: any) {
    return this.service.assignSubject(id, dto, user.institutionId);
  }

  @Patch(':id/subjects/:subjectId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update teacher assignment for a subject in this class (Admin only)' })
  updateSubjectTeacher(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @Body() body: { teacherId?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.updateSubjectTeacher(id, subjectId, body.teacherId ?? null, user.institutionId);
  }

  @Delete(':id/subjects/:subjectId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a subject from this class (Admin only)' })
  removeSubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.removeSubject(id, subjectId, user.institutionId);
  }
}
