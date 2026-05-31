import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { TransferDirection } from '@prisma/client';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  list(
    @Req() req,
    @Query('direction') direction?: TransferDirection,
    @Query('studentId') studentId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(req.user.institutionId, { direction, studentId, search });
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateTransferDto, @Req() req) {
    return this.service.create(dto, req.user.institutionId, req.user.name, req.user.sub);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTransferDto>, @Req() req) {
    return this.service.update(id, dto, req.user.institutionId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.institutionId);
  }
}
