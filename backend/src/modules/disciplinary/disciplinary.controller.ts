import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { DisciplinaryService } from './disciplinary.service';
import { CreateDisciplinaryDto } from './dto/create-disciplinary.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { DisciplinaryType } from '@prisma/client';

@Controller('disciplinary')
export class DisciplinaryController {
  constructor(private readonly service: DisciplinaryService) {}

  @Get()
  @Roles(Role.ADMIN)
  listAll(
    @Req() req: any,
    @Query('type') type?: DisciplinaryType,
    @Query('resolved') resolved?: string,
  ) {
    const resolvedBool = resolved !== undefined ? resolved === 'true' : undefined;
    return this.service.listByInstitution(req.user.institutionId, { type, resolved: resolvedBool });
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER)
  listByStudent(@Param('studentId') studentId: string, @Req() req: any) {
    return this.service.listByStudent(studentId, req.user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateDisciplinaryDto, @Req() req: any) {
    return this.service.create(
      dto,
      req.user.institutionId,
      req.user.name,
      req.user.id,
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateDisciplinaryDto>, @Req() req: any) {
    return this.service.update(id, dto, req.user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.institutionId);
  }
}
