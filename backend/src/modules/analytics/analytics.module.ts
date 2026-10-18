import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [WhatsAppModule, AttendanceModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
