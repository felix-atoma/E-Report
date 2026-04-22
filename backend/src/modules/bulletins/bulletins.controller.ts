import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BulletinsService } from './bulletins.service';

@ApiTags('bulletins')
@ApiBearerAuth()
@Controller('bulletins')
export class BulletinsController {
  constructor(private readonly service: BulletinsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
