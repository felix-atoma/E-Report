import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BrandingService } from './branding.service';

@ApiTags('branding')
@ApiBearerAuth()
@Controller('branding')
export class BrandingController {
  constructor(private readonly service: BrandingService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
