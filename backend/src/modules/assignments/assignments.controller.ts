import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('lms/assignments')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.service.list(req.user.institutionId, req.user.id, req.user.role, classId, subjectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateAssignmentDto, @Req() req: any) {
    return this.service.create(dto, req.user.institutionId, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(@Param('id') id: string, @Body() dto: Partial<CreateAssignmentDto>, @Req() req: any) {
    return this.service.update(id, dto, req.user.institutionId, req.user.id, req.user.role);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN, Role.TEACHER)
  publish(@Param('id') id: string, @Req() req: any) {
    return this.service.publish(id, req.user.institutionId, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.institutionId, req.user.id, req.user.role);
  }

  @Get(':id/submissions')
  @Roles(Role.ADMIN, Role.TEACHER)
  listSubmissions(@Param('id') id: string, @Req() req: any) {
    return this.service.listSubmissions(id, req.user.institutionId);
  }

  @Post(':id/submit')
  @Roles(Role.STUDENT)
  submit(@Param('id') id: string, @Body() dto: SubmitAssignmentDto, @Req() req: any) {
    return this.service.submit(id, dto, req.user.id, req.user.institutionId);
  }

  @Get(':id/my-submission')
  @Roles(Role.STUDENT)
  mySubmission(@Param('id') id: string, @Req() req: any) {
    return this.service.getMySubmission(id, req.user.id, req.user.institutionId);
  }

  @Patch(':id/submissions/:submissionId/grade')
  @Roles(Role.ADMIN, Role.TEACHER)
  grade(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @Req() req: any,
  ) {
    return this.service.grade(id, submissionId, dto, req.user.id, req.user.institutionId);
  }
}
