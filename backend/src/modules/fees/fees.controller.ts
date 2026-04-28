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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { AssignFeeDto } from './dto/assign-fee.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('fees')
@ApiBearerAuth()
@Controller('fees')
export class FeesController {
  constructor(private readonly service: FeesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'List all fee structures for the institution' })
  @ApiQuery({ name: 'academicYear', required: false })
  findAll(@CurrentUser() user: any, @Query('academicYear') academicYear?: string) {
    return this.service.findAll(user.institutionId, academicYear);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a fee structure (Admin only)' })
  create(@Body() dto: CreateFeeDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a fee structure (Admin only)' })
  update(@Param('id') id: string, @Body() dto: CreateFeeDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a fee structure (Admin only)' })
  deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deactivate(id, user.institutionId);
  }

  @Post(':id/assign-to-class')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Assign a fee to all students enrolled in a class' })
  assignToClass(@Param('id') id: string, @Body() dto: AssignFeeDto, @CurrentUser() user: any) {
    return this.service.assignToClass(id, dto, user.institutionId);
  }

  @Get('student/:studentId/summary')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Get fee and payment summary for a student' })
  @ApiQuery({ name: 'academicYear', required: false })
  getStudentFeeSummary(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.getStudentFeeSummary(studentId, user.institutionId, academicYear);
  }
}
