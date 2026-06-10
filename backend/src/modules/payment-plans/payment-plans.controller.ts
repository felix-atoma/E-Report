import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentPlansService } from './payment-plans.service';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { PayInstalmentDto } from './dto/pay-instalment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('payment-plans')
@ApiBearerAuth()
@Controller('payment-plans')
export class PaymentPlansController {
  constructor(private readonly service: PaymentPlansService) {}

  @Post()
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Create a payment plan with instalments for a student' })
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentPlanDto) {
    return this.service.create(user.institutionId, user.id, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'List all payment plans (optionally filter by student / year)' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'academicYear', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('studentId') studentId?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.findAll(user.institutionId, studentId, academicYear);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Get a single payment plan with its instalments' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId);
  }

  @Post('instalments/:instalmentId/pay')
  @Roles(Role.ADMIN, Role.BURSAR)
  @ApiOperation({ summary: 'Mark an instalment as paid' })
  payInstalment(
    @Param('instalmentId') instalmentId: string,
    @CurrentUser() user: any,
    @Body() dto: PayInstalmentDto,
  ) {
    return this.service.payInstalment(instalmentId, user.institutionId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a payment plan (cascades to instalments)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deletePlan(id, user.institutionId);
  }
}
