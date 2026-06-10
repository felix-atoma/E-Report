import { Module } from '@nestjs/common';
import { IncidentReportsController } from './incident-reports.controller';
import { IncidentReportsService } from './incident-reports.service';

@Module({
  controllers: [IncidentReportsController],
  providers: [IncidentReportsService],
})
export class IncidentReportsModule {}
