import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { LibraryService } from './library.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('library')
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  list(
    @Req() req,
    @Query('isReturned') isReturned?: string,
    @Query('search') search?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.service.list(req.user.institutionId, {
      isReturned: isReturned !== undefined ? isReturned === 'true' : undefined,
      search,
      overdue: overdue === 'true',
    });
  }

  @Get('student/:studentId')
  @Roles('ADMIN', 'TEACHER')
  listByStudent(@Param('studentId') studentId: string, @Req() req) {
    return this.service.listByStudent(studentId, req.user.institutionId);
  }

  @Post()
  @Roles('ADMIN', 'TEACHER')
  create(@Body() dto: CreateLoanDto, @Req() req) {
    return this.service.create(dto, req.user.institutionId, req.user.name, req.user.id);
  }

  @Patch(':id/return')
  @Roles('ADMIN', 'TEACHER')
  returnLoan(
    @Param('id') id: string,
    @Body('conditionIn') conditionIn: string,
    @Req() req,
  ) {
    return this.service.returnLoan(id, req.user.institutionId, conditionIn);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.institutionId);
  }
}
