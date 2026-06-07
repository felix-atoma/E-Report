import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { NotchpayService } from '../payments/notchpay.service';
import { MailModule } from '../mail/mail.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, MailModule, WhatsAppModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, NotchpayService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
