import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BrandingService } from './branding.service';
import { CreateBrandingAssetDto } from './dto/create-branding-asset.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('branding')
@ApiBearerAuth()
@Controller('branding')
export class BrandingController {
  constructor(private readonly service: BrandingService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all branding assets for the institution' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add a branding asset (Admin only)' })
  create(@Body() dto: CreateBrandingAssetDto, @CurrentUser() user: any) {
    return this.service.create(user.institutionId, dto.type, dto.fileUrl, dto.label);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a branding asset (Admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }
}
