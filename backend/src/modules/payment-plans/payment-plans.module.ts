import { Module } from '@nestjs/common';
import { PaymentPlansService } from './payment-plans.service';
import { PaymentPlansController } from './payment-plans.controller';

@Module({
  controllers: [PaymentPlansController],
  providers: [PaymentPlansService],
  exports: [PaymentPlansService],
})
export class PaymentPlansModule {}
