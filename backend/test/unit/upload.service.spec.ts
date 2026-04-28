import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { UploadService, UploadedFileInfo } from '../../src/modules/upload/upload.service';

jest.mock('fs');
const fsMock = fs as jest.Mocked<typeof fs>;

const BASE_URL = 'http://localhost:4000';
const UPLOADS_DIR = '/tmp/test-uploads';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const map: Record<string, string> = {
    UPLOADS_DIR,
    BASE_URL,
    ...overrides,
  };
  return { get: (key: string, def?: string) => map[key] ?? def } as any;
}

function makeFile(overrides: Partial<UploadedFileInfo> = {}): UploadedFileInfo {
  return {
    fieldname: 'file',
    originalname: 'logo.png',
    mimetype: 'image/png',
    size: 1024,
    path: '/tmp/tmp-upload-abc.png',
    ...overrides,
  };
}

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    jest.clearAllMocks();
    fsMock.mkdirSync.mockImplementation(() => undefined);
    fsMock.renameSync.mockImplementation(() => undefined);
    fsMock.existsSync.mockReturnValue(true);
    fsMock.unlinkSync.mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: ConfigService, useValue: makeConfig() },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  // ─── handleFileUpload ────────────────────────────────────────────────────

  describe('handleFileUpload', () => {
    it('returns url, filename, size, and mimetype on success', () => {
      const file = makeFile();
      const result = service.handleFileUpload(file, 'logo', 'inst-001');

      expect(result.url).toMatch(/^http:\/\/localhost:4000\/uploads\/logos\//);
      expect(result.mimetype).toBe('image/png');
      expect(result.size).toBe(1024);
      expect(result.filename).toMatch(/\.png$/);
    });

    it('moves file to correct subdir for known type', () => {
      const file = makeFile();
      service.handleFileUpload(file, 'stamp', 'inst-001');

      expect(fsMock.renameSync).toHaveBeenCalledWith(
        file.path,
        expect.stringContaining(`${path.sep}stamps${path.sep}`),
      );
    });

    it('falls back to "attachments" subdir for unknown type', () => {
      const file = makeFile({ originalname: 'doc.pdf', mimetype: 'application/pdf' });
      service.handleFileUpload(file, 'unknown_type', 'inst-001');

      expect(fsMock.renameSync).toHaveBeenCalledWith(
        file.path,
        expect.stringContaining(`${path.sep}attachments${path.sep}`),
      );
    });

    it('prefixes filename with institutionId', () => {
      const file = makeFile();
      const result = service.handleFileUpload(file, 'logo', 'inst-XYZ');

      expect(result.filename).toMatch(/^inst-XYZ-/);
    });

    it('preserves original file extension', () => {
      const file = makeFile({ originalname: 'stamp.WEBP', mimetype: 'image/webp' });
      const result = service.handleFileUpload(file, 'stamp', 'inst-001');

      expect(result.filename).toMatch(/\.webp$/i);
    });

    it('throws BadRequestException when no file is provided', () => {
      expect(() =>
        service.handleFileUpload(null as any, 'logo', 'inst-001'),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException for disallowed mimetype', () => {
      const file = makeFile({ mimetype: 'text/html' });

      expect(() =>
        service.handleFileUpload(file, 'logo', 'inst-001'),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException when file exceeds 5 MB', () => {
      const file = makeFile({ size: 6 * 1024 * 1024 });

      expect(() =>
        service.handleFileUpload(file, 'logo', 'inst-001'),
      ).toThrow(BadRequestException);
    });

    it('accepts PDF mimetype for attachment type', () => {
      const file = makeFile({ originalname: 'receipt.pdf', mimetype: 'application/pdf' });

      expect(() =>
        service.handleFileUpload(file, 'attachment', 'inst-001'),
      ).not.toThrow();
    });

    it('accepts all supported image mimetypes', () => {
      const types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

      for (const mimetype of types) {
        jest.clearAllMocks();
        fsMock.mkdirSync.mockImplementation(() => undefined);
        fsMock.renameSync.mockImplementation(() => undefined);

        const file = makeFile({ mimetype, originalname: 'img.jpg' });
        expect(() =>
          service.handleFileUpload(file, 'logo', 'inst-001'),
        ).not.toThrow();
      }
    });
  });

  // ─── deleteFile ──────────────────────────────────────────────────────────

  describe('deleteFile', () => {
    it('deletes the file when it exists', () => {
      fsMock.existsSync.mockReturnValue(true);

      service.deleteFile(`${BASE_URL}/uploads/logos/inst-001-abc.png`);

      expect(fsMock.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining(`logos${path.sep}inst-001-abc.png`),
      );
    });

    it('does not call unlinkSync when file does not exist', () => {
      fsMock.existsSync.mockReturnValue(false);

      service.deleteFile(`${BASE_URL}/uploads/logos/missing.png`);

      expect(fsMock.unlinkSync).not.toHaveBeenCalled();
    });

    it('does not throw for a malformed URL', () => {
      expect(() => service.deleteFile('not-a-valid-url')).not.toThrow();
    });

    it('does not throw for an empty string', () => {
      expect(() => service.deleteFile('')).not.toThrow();
    });
  });

  // ─── ensureDirectories (via constructor) ─────────────────────────────────

  describe('ensureDirectories', () => {
    it('creates all expected subdirectories on startup', async () => {
      jest.clearAllMocks();
      fsMock.mkdirSync.mockImplementation(() => undefined);

      await Test.createTestingModule({
        providers: [
          UploadService,
          { provide: ConfigService, useValue: makeConfig() },
        ],
      }).compile();

      const createdPaths = (fsMock.mkdirSync as jest.Mock).mock.calls.map(([p]: [string]) => p);
      const expectedSubdirs = ['logos', 'crests', 'stamps', 'signatures', 'watermarks', 'headers', 'student-photos', 'attachments', 'receipts', 'report-card-pdfs'];

      for (const subdir of expectedSubdirs) {
        expect(createdPaths.some((p) => p.includes(subdir))).toBe(true);
      }
    });
  });
});
