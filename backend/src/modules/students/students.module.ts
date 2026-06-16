import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { PdfModule } from '../pdf/pdf.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [ConfigModule, PdfModule, MailModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
