import { Module } from '@nestjs/common';
import { MockExamsController } from './mock-exams.controller';
import { MockExamsService } from './mock-exams.service';

@Module({
  controllers: [MockExamsController],
  providers: [MockExamsService],
})
export class MockExamsModule {}
