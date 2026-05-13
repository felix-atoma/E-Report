import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('lms/materials')
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.list(req.user.institutionId, classId, subjectId, academicYear);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateMaterialDto, @Req() req: any) {
    return this.service.create(dto, req.user.institutionId, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.institutionId, req.user.id, req.user.role);
  }
}
