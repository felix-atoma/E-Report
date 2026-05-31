import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  list(
    @CurrentUser() user: any,
    @Query('direction') direction?: string,
    @Query('studentId') studentId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user.institutionId, { direction: direction as any, studentId, search });
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTransferDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.name, user.sub);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateTransferDto>, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }
}
