import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update student details (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId);
  }
}
