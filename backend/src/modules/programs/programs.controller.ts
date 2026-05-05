import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { UpsertProgramDto } from './dto/upsert-program.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramsController {
  constructor(private readonly service: ProgramsService) {}

  @Get('class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List all subject programs for a class' })
  @ApiQuery({ name: 'academicYear', required: true })
  listForClass(
    @Param('classId') classId: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ) {
    return this.service.listForClass(classId, academicYear, user.institutionId);
  }

  @Get('class/:classId/subject/:subjectId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get subject program (chapters + objectives)' })
  @ApiQuery({ name: 'academicYear', required: true })
  findOne(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findOne(classId, subjectId, academicYear, user.institutionId);
  }

  @Put('class/:classId/subject/:subjectId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Create or update subject program with chapters' })
  upsert(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: UpsertProgramDto,
    @CurrentUser() user: any,
  ) {
    return this.service.upsert(classId, subjectId, dto, user.institutionId, user.id, user.role);
  }
}
