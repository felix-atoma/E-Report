import { Module } from '@nestjs/common';
import { SchoolDocumentsController } from './school-documents.controller';
import { SchoolDocumentsService } from './school-documents.service';

@Module({
  controllers: [SchoolDocumentsController],
  providers: [SchoolDocumentsService],
})
export class SchoolDocumentsModule {}
