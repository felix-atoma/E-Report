import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubjectHoursService } from './subject-hours.service';
import { UpsertSubjectHoursDto } from './dto/upsert-subject-hours.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('subject-hours')
@ApiBearerAuth()
@Controller('subjects/:subjectId/hours')
export class SubjectHoursController {
  constructor(private readonly service: SubjectHoursService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get all hours logs for a subject' })
  findAll(@Param('subjectId') subjectId: string, @CurrentUser() user: any) {
    return this.service.findBySubject(subjectId, user.institutionId);
  }

  @Put()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Create or update a subject hours log entry' })
  upsert(
    @Param('subjectId') subjectId: string,
    @Body() dto: UpsertSubjectHoursDto,
    @CurrentUser() user: any,
  ) {
    return this.service.upsert(subjectId, dto, user.institutionId);
  }
}
