import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as os from 'os';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users in the institution' })
  @ApiQuery({ name: 'role', enum: Role, required: false })
  findAll(@CurrentUser() user: any, @Query('role') role?: Role) {
    return this.service.findAll(user.institutionId, role);
  }

  @Get('teachers')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List all teachers in the institution' })
  findTeachers(@CurrentUser() user: any) {
    return this.service.findAll(user.institutionId, Role.TEACHER);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user in the institution (Admin only)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.institutionId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile (Admin or self)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user.id, user.role, user.institutionId);
  }

  @Post(':id/avatar')
  @ApiOperation({ summary: 'Upload profile photo (Admin or self)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cb(null, unique + path.extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: any,
  ) {
    return this.service.uploadAvatar(id, file, user.id, user.role, user.institutionId);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user (Admin only)' })
  deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.setActive(id, false, user.institutionId);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a user (Admin only)' })
  activate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.setActive(id, true, user.institutionId);
  }
}
