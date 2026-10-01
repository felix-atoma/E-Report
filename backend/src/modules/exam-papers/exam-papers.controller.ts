import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { ExamPapersService, MAX_FILES, MAX_TOTAL_BYTES } from './exam-papers.service';
import { CreateExamPaperDto, ReturnExamPaperDto, UpdateExamPaperDto } from './dto/exam-paper.dto';

/**
 * Épreuves : le professeur importe son sujet (PDF, photos, Word), l'IA le transcrit, il le corrige
 * puis le soumet ; l'administration le télécharge en Word, l'imprime ou le renvoie pour correction.
 */
@ApiTags('exam-papers')
@ApiBearerAuth()
@Controller('exam-papers')
export class ExamPapersController {
  constructor(private readonly service: ExamPapersService) {}

  @Post()
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Importer une épreuve et la faire transcrire par l'IA" })
  // Fichiers gardés en mémoire : envoyés à l'IA puis à Cloudinary, jamais écrits sur le disque
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, { limits: { fileSize: MAX_TOTAL_BYTES } }))
  create(@CurrentUser() user: any, @Body() dto: CreateExamPaperDto, @UploadedFiles() files: Express.Multer.File[]) {
    return this.service.create(user, dto, files);
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN)
  list(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.list(user, status);
  }

  @Get(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateExamPaperDto) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/submit')
  @Roles(Role.TEACHER, Role.ADMIN)
  submit(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.submit(user, id);
  }

  @Post(':id/return')
  @Roles(Role.ADMIN)
  returnToAuthor(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ReturnExamPaperDto) {
    return this.service.returnToAuthor(user, id, dto.comment);
  }

  @Post(':id/printed')
  @Roles(Role.ADMIN)
  markPrinted(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.markPrinted(user, id);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.ADMIN)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Get(':id/docx')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Télécharger l’épreuve en Word (en-tête de l’école + sujet)' })
  async docx(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.service.docx(user, id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
