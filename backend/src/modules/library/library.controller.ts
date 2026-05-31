import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LibraryService } from './library.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('library')
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  list(
    @CurrentUser() user: any,
    @Query('isReturned') isReturned?: string,
    @Query('search') search?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.service.list(user.institutionId, {
      isReturned: isReturned !== undefined ? isReturned === 'true' : undefined,
      search,
      overdue: overdue === 'true',
    });
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER)
  listByStudent(@Param('studentId') studentId: string, @CurrentUser() user: any) {
    return this.service.listByStudent(studentId, user.institutionId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateLoanDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.name, user.sub);
  }

  @Patch(':id/return')
  @Roles(Role.ADMIN, Role.TEACHER)
  returnLoan(
    @Param('id') id: string,
    @Body('conditionIn') conditionIn: string,
    @CurrentUser() user: any,
  ) {
    return this.service.returnLoan(id, user.institutionId, conditionIn);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.institutionId);
  }
}
