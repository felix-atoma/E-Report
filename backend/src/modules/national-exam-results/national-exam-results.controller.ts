import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { NationalExamResultsService } from './national-exam-results.service';
import { UpsertExamResultDto } from './dto/upsert-exam-result.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { NationalExamType } from '@prisma/client';

@Controller('national-exam-results')
export class NationalExamResultsController {
  constructor(private readonly service: NationalExamResultsService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  list(
    @Req() req,
    @Query('examType') examType?: NationalExamType,
    @Query('academicYear') academicYear?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(req.user.institutionId, { examType, academicYear, search });
  }

  @Get('summary')
  @Roles('ADMIN')
  summary(
    @Req() req,
    @Query('examType') examType?: NationalExamType,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.summary(req.user.institutionId, { examType, academicYear });
  }

  @Get('student/:studentId')
  @Roles('ADMIN', 'TEACHER')
  listByStudent(@Param('studentId') studentId: string, @Req() req) {
    return this.service.listByStudent(studentId, req.user.institutionId);
  }

  @Post()
  @Roles('ADMIN')
  upsert(@Body() dto: UpsertExamResultDto, @Req() req) {
    return this.service.upsert(dto, req.user.institutionId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.institutionId);
  }
}
