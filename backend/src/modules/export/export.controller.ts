import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

function sendCsv(res: Response, csv: string, filename: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

@ApiTags('export')
@ApiBearerAuth()
@Controller('export')
@Roles(Role.ADMIN)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('students')
  @ApiOperation({ summary: 'Export student census as CSV (Admin only)' })
  async exportStudents(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.exportService.studentCensus(user.institutionId);
    sendCsv(res, csv, `eleves_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  @Get('class-results')
  @ApiOperation({ summary: 'Export class results as CSV (Admin only)' })
  @ApiQuery({ name: 'academicYear', required: true, example: '2024-2025' })
  @ApiQuery({ name: 'termName', required: true, example: 'Trimestre 1' })
  async exportClassResults(
    @Query('academicYear') academicYear: string,
    @Query('termName') termName: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.classResults(user.institutionId, academicYear, termName);
    const slug = termName.replace(/\s+/g, '_');
    sendCsv(res, csv, `resultats_${academicYear}_${slug}.csv`);
  }

  @Get('fees')
  @ApiOperation({ summary: 'Export fee report as CSV (Admin only)' })
  @ApiQuery({ name: 'academicYear', required: true, example: '2024-2025' })
  async exportFees(
    @Query('academicYear') academicYear: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.feeReport(user.institutionId, academicYear);
    sendCsv(res, csv, `frais_${academicYear}.csv`);
  }
}
