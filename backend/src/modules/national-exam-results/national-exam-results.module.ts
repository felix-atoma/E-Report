import { Module } from '@nestjs/common';
import { NationalExamResultsController } from './national-exam-results.controller';
import { NationalExamResultsService } from './national-exam-results.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NationalExamResultsController],
  providers: [NationalExamResultsService],
})
export class NationalExamResultsModule {}
