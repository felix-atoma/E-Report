import { Module } from '@nestjs/common';
import { PdfModule } from '../pdf/pdf.module';
import { MockExamsController } from './mock-exams.controller';
import { MockExamsService } from './mock-exams.service';

@Module({
  imports: [PdfModule],
  controllers: [MockExamsController],
  providers: [MockExamsService],
})
export class MockExamsModule {}
