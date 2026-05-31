import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { NationalExamResultsService } from './national-exam-results.service';
import { UpsertExamResultDto } from './dto/upsert-exam-result.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('national-exam-results')
export class NationalExamResultsController {
  constructor(private readonly service: NationalExamResultsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  list(
    @CurrentUser() user: any,
    @Query('examType') examType?: string,
    @Query('academicYear') academicYear?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user.institutionId, { examType: examType as any, academicYear, search });
  }

  @Get('summary')
  @Roles(Role.ADMIN)
  summary(
    @CurrentUser() user: any,
    @Query('examType') examType?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.summary(user.institutionId, { examType: examType as any, academicYear });
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER)
  listByStudent(@Param('studentId') studentId: string, @CurrentUser() user: any) {
    return this.service.listByStudent(studentId, user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN)
  upsert(@Body() dto: UpsertExamResultDto, @CurrentUser() user: any) {
    return this.service.upsert(dto, user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }
}
