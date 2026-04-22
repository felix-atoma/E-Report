import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GradesService } from './grades.service';

@ApiTags('grades')
@ApiBearerAuth()
@Controller('grades')
export class GradesController {
  constructor(private readonly service: GradesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
