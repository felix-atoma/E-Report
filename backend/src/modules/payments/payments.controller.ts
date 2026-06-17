import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CinetpayService } from './cinetpay.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    private readonly cinetpay: CinetpayService,
  ) {}

  @Get('my-history')
  @Roles(Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Student: own payment history. Parent: children\'s payment history.' })
  findMyHistory(@CurrentUser() user: any) {
    if (user.role === Role.STUDENT) {
      return this.service.findForStudent(user.id, user.institutionId);
    }
    return this.service.findForParent(user.id, user.institutionId);
  }

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

  @Get(':id/receipt')
  @Roles(Role.ADMIN, Role.BURSAR, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Download payment receipt as PDF' })
  async getReceipt(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const buf = await this.service.generateReceipt(id, user.institutionId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu-${id}.pdf"`);
    res.send(buf);
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

  @Get('my-children/:studentId/status')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Parent: get aggregated payment status for own child' })
  @ApiQuery({ name: 'academicYear', required: true })
  @ApiQuery({ name: 'term', required: false })
  getMyChildStatus(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query('academicYear') academicYear: string,
    @Query('term') term?: string,
  ) {
    return this.service.getMyChildPaymentStatus(studentId, user.id, user.institutionId, academicYear, term);
  }

  // ── Online MoMo payment (FedaPay) ────────────────────────────────────────

  @Post('initiate-momo')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Parent: initiate online MoMo payment via FedaPay' })
  initiateMomo(
    @Body() body: { studentId: string; academicYear: string; term?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.initiateOnlinePayment(
      body.studentId,
      user.institutionId,
      body.academicYear,
      body.term,
      user.id,
      user.name ?? 'Parent',
      user.email,
    );
  }

  @Public()
  @Post('webhook/notchpay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notchpay webhook — do not call manually' })
  notchpayWebhook(@Body() body: any, @Req() req: any) {
    const signature = req.headers['x-notch-signature'] ?? '';
    return this.service.handleNotchpayWebhook(body, signature);
  }

  // ── CinetPay online payment ───────────────────────────────────────────────

  @Post('cinetpay/initiate')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Parent: initiate CinetPay online payment' })
  cinetpayInitiate(
    @Body() body: { studentId: string; academicYear: string; term?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.initiateOnlineCinetpayPayment(
      body.studentId,
      user.institutionId,
      body.academicYear,
      body.term,
      user.id,
      user.name ?? 'Parent',
      user.email,
    );
  }

  @Public()
  @Post('cinetpay/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'CinetPay IPN webhook — do not call manually' })
  cinetpayWebhook(@Body() body: any) {
    const { cpm_trans_id, cpm_result } = body ?? {};
    return this.service.handleCinetpayWebhook(cpm_trans_id ?? '', cpm_result ?? '');
  }
}
