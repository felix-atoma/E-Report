import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InstitutionsService } from './institutions.service';

@ApiTags('institutions')
@ApiBearerAuth()
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly service: InstitutionsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
