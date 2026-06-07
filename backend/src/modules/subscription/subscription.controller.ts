import {
  Controller, Get, Post, Param, Body, Req,
  RawBodyRequest, Headers, HttpCode,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { InitiateNotchpayDto, SubmitMomoDto, RejectSubscriptionDto } from './dto/subscription.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ─── School admin ─────────────────────────────────────────────────────────

  /** Get subscription status for the current school */
  @Roles(Role.ADMIN, Role.BURSAR)
  @Get('subscription/status')
  getStatus(@Req() req: any) {
    return this.subscriptionService.getStatus(req.user.institutionId);
  }

  /** Initiate Notchpay checkout */
  @Roles(Role.ADMIN)
  @Post('subscription/notchpay')
  initiateNotchpay(@Req() req: any, @Body() dto: InitiateNotchpayDto) {
    return this.subscriptionService.initiateNotchpay(
      req.user.institutionId,
      dto,
      req.user.email,
      req.user.name,
    );
  }

  /** Submit manual MoMo payment proof */
  @Roles(Role.ADMIN)
  @Post('subscription/momo')
  submitMomo(@Req() req: any, @Body() dto: SubmitMomoDto) {
    return this.subscriptionService.submitMomo(req.user.institutionId, dto);
  }

  /** Get payment history for the current school */
  @Roles(Role.ADMIN)
  @Get('subscription/history')
  getHistory(@Req() req: any) {
    return this.subscriptionService.getPaymentHistory(req.user.institutionId);
  }

  // ─── Notchpay webhook (public) ────────────────────────────────────────────

  @Public()
  @Post('subscription/webhook/notchpay')
  @HttpCode(200)
  notchpayWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('x-notch-signature') signature: string,
    @Body() payload: any,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(payload);
    return this.subscriptionService.handleWebhook(rawBody, signature, payload);
  }

  // ─── Superadmin ───────────────────────────────────────────────────────────

  @Roles(Role.SUPERADMIN)
  @Get('superadmin/subscriptions/pending')
  getPending() {
    return this.subscriptionService.getPending();
  }

  @Roles(Role.SUPERADMIN)
  @Get('superadmin/subscriptions')
  getAll() {
    return this.subscriptionService.getAllPayments();
  }

  @Roles(Role.SUPERADMIN)
  @Post('superadmin/subscriptions/:id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.subscriptionService.approve(id, req.user.id);
  }

  @Roles(Role.SUPERADMIN)
  @Post('superadmin/subscriptions/:id/reject')
  reject(@Param('id') id: string, @Req() req: any, @Body() dto: RejectSubscriptionDto) {
    return this.subscriptionService.reject(id, req.user.id, dto.reason);
  }
}
