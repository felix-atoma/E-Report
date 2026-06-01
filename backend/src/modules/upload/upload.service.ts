import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

export interface UploadedFileInfo {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  buffer?: Buffer;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
const ALLOWED_DOC_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const SUBDIR_MAP: Record<string, string> = {
  logo: 'logos',
  crest: 'crests',
  stamp: 'stamps',
  signature: 'signatures',
  watermark: 'watermarks',
  header: 'headers',
  student_photo: 'student-photos',
  attachment: 'attachments',
  receipt: 'receipts',
};

const LMS_SUBDIR = 'lms-attachments';
const LMS_MAX_SIZE = 50 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly uploadsRoot: string;
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cloudinary: CloudinaryService,
  ) {
    this.uploadsRoot = path.resolve(
      process.cwd(),
      config.get<string>('UPLOADS_DIR', 'uploads'),
    );
    this.baseUrl = config.get<string>('BASE_URL', 'http://localhost:4000');
    if (!this.cloudinary.enabled) this.ensureDirectories();
  }

  async handleFileUpload(
    file: UploadedFileInfo,
    type: string,
    institutionId: string,
  ): Promise<{ url: string; filename: string; size: number; mimetype: string }> {
    if (!file) throw new BadRequestException('No file provided');

    const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type '${file.mimetype}' is not allowed`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5 MB limit');
    }

    const subdir = SUBDIR_MAP[type] ?? 'attachments';

    if (this.cloudinary.enabled) {
      const folder = `novabulletin/${institutionId}/${subdir}`;
      const resourceType = ALLOWED_IMAGE_TYPES.includes(file.mimetype) ? 'image' : 'raw';
      const url = await this.cloudinary.uploadFile(file.path, folder, resourceType);
      try { fs.unlinkSync(file.path); } catch {}
      return { url, filename: path.basename(url), size: file.size, mimetype: file.mimetype };
    }

    // Local fallback
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${institutionId}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const destDir = path.join(this.uploadsRoot, subdir);
    const destPath = path.join(destDir, uniqueName);
    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(file.path, destPath);
    const url = `${this.baseUrl}/uploads/${subdir}/${uniqueName}`;
    return { url, filename: uniqueName, size: file.size, mimetype: file.mimetype };
  }

  async handleLmsFileUpload(
    file: UploadedFileInfo,
    institutionId: string,
  ): Promise<{ url: string; filename: string; size: number; mimetype: string }> {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > LMS_MAX_SIZE) throw new BadRequestException('File size exceeds 50 MB limit');

    if (this.cloudinary.enabled) {
      const folder = `novabulletin/${institutionId}/${LMS_SUBDIR}`;
      const url = await this.cloudinary.uploadFile(file.path, folder, 'auto');
      try { fs.unlinkSync(file.path); } catch {}
      return { url, filename: file.originalname, size: file.size, mimetype: file.mimetype };
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${institutionId}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const destDir = path.join(this.uploadsRoot, LMS_SUBDIR);
    const destPath = path.join(destDir, uniqueName);
    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(file.path, destPath);
    const url = `${this.baseUrl}/uploads/${LMS_SUBDIR}/${uniqueName}`;
    return { url, filename: file.originalname, size: file.size, mimetype: file.mimetype };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (this.cloudinary.enabled) {
      await this.cloudinary.deleteByUrl(fileUrl);
      return;
    }
    try {
      const urlPath = new URL(fileUrl).pathname;
      const relativePath = urlPath.replace(/^\/uploads\//, '');
      const absPath = path.join(this.uploadsRoot, relativePath);
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    } catch {}
  }

  private ensureDirectories() {
    for (const subdir of Object.values(SUBDIR_MAP)) {
      fs.mkdirSync(path.join(this.uploadsRoot, subdir), { recursive: true });
    }
    fs.mkdirSync(path.join(this.uploadsRoot, 'report-card-pdfs'), { recursive: true });
    fs.mkdirSync(path.join(this.uploadsRoot, LMS_SUBDIR), { recursive: true });
  }
}
