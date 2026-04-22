import { Module } from '@nestjs/common';
import { BulletinsController } from './bulletins.controller';
import { BulletinsService } from './bulletins.service';

@Module({
  controllers: [BulletinsController],
  providers: [BulletinsService],
  exports: [BulletinsService],
})
export class BulletinsModule {}
