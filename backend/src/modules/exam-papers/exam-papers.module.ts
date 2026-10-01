import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ExamPapersController } from './exam-papers.controller';
import { ExamPapersService } from './exam-papers.service';

@Module({
  imports: [AiModule],
  controllers: [ExamPapersController],
  providers: [ExamPapersService],
})
export class ExamPapersModule {}
