import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get()
  @Roles(Role.ADMIN)
  list(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list(user.institutionId, { search, from, to });
  }

  @Get('summary')
  @Roles(Role.ADMIN)
  summary(@CurrentUser() user: any) {
    return this.service.summary(user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreatePurchaseDto>, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }
}
