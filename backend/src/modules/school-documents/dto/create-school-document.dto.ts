import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DocumentCategory } from '@prisma/client';

export class CreateSchoolDocumentDto {
  @IsString() title: string;
  @IsString() fileUrl: string;
  @IsOptional() @IsEnum(DocumentCategory) category?: DocumentCategory;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsNumber() fileSize?: number;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}
