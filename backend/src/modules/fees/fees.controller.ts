import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeesService } from './fees.service';

@ApiTags('fees')
@ApiBearerAuth()
@Controller('fees')
export class FeesController {
  constructor(private readonly service: FeesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
