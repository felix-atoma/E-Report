import { Module } from '@nestjs/common';
import { SubjectHoursController } from './subject-hours.controller';
import { SubjectHoursService } from './subject-hours.service';

@Module({
  controllers: [SubjectHoursController],
  providers: [SubjectHoursService],
})
export class SubjectHoursModule {}
