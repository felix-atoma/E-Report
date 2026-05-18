import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminController } from './superadmin.controller';

@Module({
  imports: [PrismaModule, MailModule, WhatsAppModule, ConfigModule],
  providers: [SuperAdminService],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
