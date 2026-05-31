import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { InventoryCategory, InventoryCondition } from '@prisma/client';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  list(
    @Req() req,
    @Query('category') category?: InventoryCategory,
    @Query('condition') condition?: InventoryCondition,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.list(req.user.institutionId, {
      category,
      condition,
      search,
      isActive: isActive !== undefined ? isActive !== 'false' : undefined,
    });
  }

  @Get('summary')
  @Roles('ADMIN')
  summary(@Req() req) {
    return this.service.summary(req.user.institutionId);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateInventoryItemDto, @Req() req) {
    return this.service.create(dto, req.user.institutionId);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: Partial<CreateInventoryItemDto>, @Req() req) {
    return this.service.update(id, dto, req.user.institutionId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.institutionId);
  }
}
