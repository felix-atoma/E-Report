import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as os from 'os';
import { UploadService, UploadedFileInfo } from './upload.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly service: UploadService) {}

  @Post('file')
  @Roles(Role.ADMIN)
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
    }),
  )
  @ApiOperation({ summary: 'Upload a file (logo, crest, stamp, student photo, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: ['logo', 'crest', 'stamp', 'signature', 'watermark', 'header', 'student_photo', 'attachment', 'receipt'],
        },
      },
    },
  })
  @ApiQuery({ name: 'type', required: true })
  uploadFile(
    @UploadedFile() file: UploadedFileInfo,
    @Query('type') type: string,
    @CurrentUser() user: any,
  ) {
    if (!type) throw new BadRequestException('Query param "type" is required');
    return this.service.handleFileUpload(file, type, user.institutionId);
  }

  @Post('lms')
  @Roles(Role.ADMIN, Role.TEACHER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cb(null, unique + path.extname(file.originalname));
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload an LMS attachment (any file type, up to 50 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadLmsFile(
    @UploadedFile() file: UploadedFileInfo,
    @CurrentUser() user: any,
  ) {
    return this.service.handleLmsFileUpload(file, user.institutionId);
  }

  @Delete('file')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an uploaded file by its URL' })
  @ApiQuery({ name: 'url', required: true })
  deleteFile(@Query('url') url: string) {
    if (!url) throw new BadRequestException('Query param "url" is required');
    this.service.deleteFile(url);
    return { message: 'File deleted' };
  }
}
