import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { SchoolDocumentsService } from './school-documents.service';
import { CreateSchoolDocumentDto } from './dto/create-school-document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { DocumentCategory } from '@prisma/client';

@Controller('school-documents')
export class SchoolDocumentsController {
  constructor(private readonly service: SchoolDocumentsService) {}

  @Get()
  list(@Req() req: any, @Query('category') category?: DocumentCategory) {
    return this.service.list(req.user.institutionId, req.user.role, category);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSchoolDocumentDto, @Req() req: any) {
    return this.service.create(dto, req.user.institutionId, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSchoolDocumentDto>,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.institutionId);
  }
}
