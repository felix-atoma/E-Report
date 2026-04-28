import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BulletinsService } from './bulletins.service';
import { CreateBulletinDto } from './dto/create-bulletin.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('bulletins')
@ApiBearerAuth()
@Controller('bulletins')
export class BulletinsController {
  constructor(private readonly service: BulletinsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bulletins/announcements for the institution' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Create a bulletin or announcement' })
  create(@Body() dto: CreateBulletinDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bulletin by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Update a bulletin (Admin or author)' })
  update(@Param('id') id: string, @Body() dto: CreateBulletinDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.institutionId, user.id, user.role);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a bulletin (Admin or author)' })
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.publish(id, user.institutionId, user.id, user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a bulletin (Admin or author)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId, user.id, user.role);
  }
}
