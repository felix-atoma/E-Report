import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [ConfigModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
