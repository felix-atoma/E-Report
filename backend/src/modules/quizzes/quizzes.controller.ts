import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('lms/quizzes')
export class QuizzesController {
  constructor(private readonly service: QuizzesService) {}

  @Get()
  list(@Req() req: any, @Query('classId') classId?: string, @Query('subjectId') subjectId?: string) {
    return this.service.list(req.user.institutionId, req.user.id, req.user.role, classId, subjectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.institutionId, req.user.role);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateQuizDto, @Req() req: any) {
    return this.service.create(dto, req.user.institutionId, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(@Param('id') id: string, @Body() dto: Partial<CreateQuizDto>, @Req() req: any) {
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

  // Questions
  @Post(':id/questions')
  @Roles(Role.ADMIN, Role.TEACHER)
  addQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto, @Req() req: any) {
    return this.service.addQuestion(id, dto, req.user.institutionId, req.user.id, req.user.role);
  }

  @Patch(':id/questions/:qId')
  @Roles(Role.ADMIN, Role.TEACHER)
  updateQuestion(@Param('id') id: string, @Param('qId') qId: string, @Body() dto: Partial<CreateQuestionDto>, @Req() req: any) {
    return this.service.updateQuestion(id, qId, dto, req.user.institutionId, req.user.id, req.user.role);
  }

  @Delete(':id/questions/:qId')
  @Roles(Role.ADMIN, Role.TEACHER)
  removeQuestion(@Param('id') id: string, @Param('qId') qId: string, @Req() req: any) {
    return this.service.removeQuestion(id, qId, req.user.institutionId, req.user.id, req.user.role);
  }

  // Attempts
  @Post(':id/attempts/start')
  @Roles(Role.STUDENT)
  startAttempt(@Param('id') id: string, @Req() req: any) {
    return this.service.startAttempt(id, req.user.id, req.user.institutionId);
  }

  @Post(':id/attempts/:attemptId/submit')
  @Roles(Role.STUDENT)
  submitAttempt(@Param('id') id: string, @Param('attemptId') attemptId: string, @Body() dto: SubmitAttemptDto, @Req() req: any) {
    return this.service.submitAttempt(id, attemptId, dto, req.user.id, req.user.institutionId);
  }

  @Get(':id/my-attempts')
  @Roles(Role.STUDENT)
  myAttempts(@Param('id') id: string, @Req() req: any) {
    return this.service.getMyAttempts(id, req.user.id, req.user.institutionId);
  }

  @Get(':id/results')
  @Roles(Role.ADMIN, Role.TEACHER)
  results(@Param('id') id: string, @Req() req: any) {
    return this.service.getResults(id, req.user.institutionId);
  }
}
