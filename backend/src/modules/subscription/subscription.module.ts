import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionCronService } from './subscription-cron.service';
import { NotchpayService } from '../payments/notchpay.service';
import { MailModule } from '../mail/mail.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), MailModule, WhatsAppModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionCronService, NotchpayService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
