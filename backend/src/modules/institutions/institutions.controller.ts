import { Body, Controller, Get, Patch, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstitutionsService } from './institutions.service';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateAcademicSettingsDto } from './dto/update-academic-settings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('institutions')
@ApiBearerAuth()
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly service: InstitutionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current institution' })
  getMe(@CurrentUser() user: any) {
    return this.service.findById(user.institutionId);
  }

  @Patch('me')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update institution details (Admin only)' })
  update(@Body() dto: UpdateInstitutionDto, @CurrentUser() user: any) {
    return this.service.update(user.institutionId, dto);
  }

  @Patch('me/branding')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update institution branding assets (Admin only)' })
  updateBranding(@Body() dto: UpdateBrandingDto, @CurrentUser() user: any) {
    return this.service.updateBranding(user.institutionId, dto);
  }

  @Patch('me/academic-settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update academic settings (Admin only)' })
  updateAcademicSettings(@Body() dto: UpdateAcademicSettingsDto, @CurrentUser() user: any) {
    return this.service.updateAcademicSettings(user.institutionId, dto);
  }

  @Get('me/export')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Export all institution data as ZIP (Admin only)' })
  async exportData(@CurrentUser() user: any, @Res() res: Response) {
    const buffer = await this.service.exportAllData(user.institutionId);
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="export_donnees_${date}.zip"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
