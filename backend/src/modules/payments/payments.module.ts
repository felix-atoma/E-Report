import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { NotchpayService } from './notchpay.service';
import { CinetpayService } from './cinetpay.service';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [ConfigModule, PdfModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, NotchpayService, CinetpayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
