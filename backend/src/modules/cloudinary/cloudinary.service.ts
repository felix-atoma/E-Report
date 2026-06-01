import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly _enabled: boolean;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey    = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    this._enabled = !!(cloudName && apiKey && apiSecret);
    if (this._enabled) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.logger.log('Cloudinary storage enabled');
    }
  }

  get enabled() { return this._enabled; }

  async uploadFile(
    filePath: string,
    folder: string,
    resourceType: 'image' | 'raw' | 'auto' = 'auto',
  ): Promise<string> {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      use_filename: false,
      unique_filename: true,
    });
    return result.secure_url;
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    publicId: string,
    resourceType: 'image' | 'raw' | 'auto' = 'auto',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, resource_type: resourceType, use_filename: false },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
          resolve(result.secure_url);
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  async deleteByUrl(url: string): Promise<void> {
    try {
      if (!url || !url.includes('cloudinary.com')) return;
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
      if (!match) return;
      const publicId = match[1];
      const resourceType = url.includes('/raw/') ? 'raw' : 'image';
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      this.logger.warn(`Cloudinary delete failed for ${url}: ${err}`);
    }
  }
}
