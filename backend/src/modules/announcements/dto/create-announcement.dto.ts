import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { AnnouncementAudience } from '@prisma/client';

export class CreateAnnouncementDto {
  @IsString() title: string;
  @IsString() body: string;
  @IsOptional() @IsEnum(AnnouncementAudience) audience?: AnnouncementAudience;
  @IsOptional() @IsString() classId?: string;
  @IsOptional() @IsBoolean() isPinned?: boolean;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}
