import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { EvaluationRemindersService } from './evaluation-reminders.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { MailModule } from '../mail/mail.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [WhatsAppModule, MailModule, SmsModule],
  controllers: [CalendarController],
  providers: [CalendarService, EvaluationRemindersService],
  exports: [CalendarService],
})
export class CalendarModule {}
