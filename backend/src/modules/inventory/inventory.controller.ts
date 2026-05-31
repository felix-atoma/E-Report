import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  list(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('condition') condition?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.list(user.institutionId, {
      category: category as any,
      condition: condition as any,
      search,
      isActive: isActive !== undefined ? isActive !== 'false' : undefined,
    });
  }

  @Get('summary')
  @Roles(Role.ADMIN)
  summary(@CurrentUser() user: any) {
    return this.service.summary(user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateInventoryItemDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateInventoryItemDto>, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }
}
