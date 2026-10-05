import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { FeeRemindersService } from './fee-reminders.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { MailModule } from '../mail/mail.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [WhatsAppModule, MailModule, SmsModule],
  controllers: [FeesController],
  providers: [FeesService, FeeRemindersService],
  exports: [FeesService],
})
export class FeesModule {}
