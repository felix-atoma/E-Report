import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { IsArray, IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

class BulkImportStudentRowDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() dateOfBirth: string;
  @IsString() sex?: string;
  @IsString() admissionNumber?: string;
  @IsString() email?: string;
  @IsString() className?: string;
}

class BulkImportStudentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportStudentRowDto)
  rows: BulkImportStudentRowDto[];
}
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get the logged-in student\'s own profile' })
  findMe(@CurrentUser() user: any) {
    return this.service.findMe(user.id, user.institutionId);
  }

  @Get('my-children')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get all children linked to the logged-in parent' })
  findMyChildren(@CurrentUser() user: any) {
    return this.service.findMyChildren(user.id, user.institutionId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.BURSAR)
  @ApiOperation({ summary: 'List all students in the institution' })
  @ApiQuery({ name: 'classId', required: false })
  findAll(@CurrentUser() user: any, @Query('classId') classId?: string) {
    return this.service.findAll(user.institutionId, classId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new student (Admin only)' })
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.BURSAR)
  @ApiOperation({ summary: 'Get student details with classes and report history' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId);
  }

  @Get(':id/certificate/:type')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate enrollment or good conduct certificate as PDF' })
  async getCertificate(
    @Param('id') id: string,
    @Param('type') type: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const certType = type === 'conduct' ? 'conduct' : 'enrollment';
    const buf = await this.service.generateCertificate(id, user.institutionId, certType);
    const filename = certType === 'conduct' ? 'certificat-bonne-conduite.pdf' : 'attestation-inscription.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update student details (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a student (Admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }

  @Post('bulk-delete')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete students (Admin only)' })
  bulkRemove(@Body() dto: BulkDeleteDto, @CurrentUser() user: any) {
    return this.service.bulkRemove(dto.ids, user.institutionId);
  }

  @Post('bulk-import')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk import students from parsed CSV rows (Admin only)' })
  bulkImport(@Body() dto: BulkImportStudentsDto, @CurrentUser() user: any) {
    return this.service.bulkImport(dto.rows, user.institutionId);
  }

  @Post('year-rollover')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-enroll all students from fromYear into toYear (keeps same classes)' })
  yearRollover(
    @Body() body: { fromYear: string; toYear: string },
    @CurrentUser() user: any,
  ) {
    return this.service.yearRollover(body.fromYear, body.toYear, user.institutionId);
  }
}
