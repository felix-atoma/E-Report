import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'List all payments for the institution' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'term', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('studentId') studentId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('term') term?: string,
  ) {
    return this.service.findAll(user.institutionId, { studentId, academicYear, term });
  }

  @Post()
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Record a payment (Bursar/Admin) — auto-releases held bulletins on full payment' })
  record(@Body() dto: RecordPaymentDto, @CurrentUser() user: any) {
    return this.service.record(dto, user.institutionId, user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Get payment details' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId);
  }

  @Get('student/:studentId/status')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Get aggregated payment status for a student' })
  @ApiQuery({ name: 'academicYear', required: true })
  @ApiQuery({ name: 'term', required: false })
  getStatus(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query('academicYear') academicYear: string,
    @Query('term') term?: string,
  ) {
    return this.service.getStudentPaymentStatus(studentId, user.institutionId, academicYear, term);
  }
}
