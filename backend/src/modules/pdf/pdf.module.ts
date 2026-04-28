import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfService } from './pdf.service';

@Module({
  imports: [ConfigModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
