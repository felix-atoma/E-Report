import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { NotchpayService } from './notchpay.service';
import { CinetpayService } from './cinetpay.service';
import { PdfModule } from '../pdf/pdf.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SmsModule } from '../sms/sms.module';
import { MailModule } from '../mail/mail.module';
import { PaymentReceiptNotifier } from './payment-receipt-notifier.service';

@Module({
  imports: [ConfigModule, PdfModule, WhatsAppModule, SmsModule, MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, NotchpayService, CinetpayService, PaymentReceiptNotifier],
  exports: [PaymentsService],
})
export class PaymentsModule {}
