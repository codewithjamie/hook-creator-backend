import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly folder: string;

  constructor(private readonly config: ConfigService) {
    this.folder = config.get<string>('CLOUDINARY_FOLDER', 'openedge-clips');
    cloudinary.config({
      cloud_name: config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
    this.logger.log(`Cloudinary initialised → cloud=${config.get('CLOUDINARY_CLOUD_NAME')}`);
  }

  async uploadVideo(localPath: string, publicId?: string): Promise<string> {
    this.logger.log(`Uploading to Cloudinary: ${localPath}`);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: this.folder, public_id: publicId, overwrite: true },
        (error, result: UploadApiResponse | undefined) => {
          if (error) return reject(new InternalServerErrorException(`Cloudinary upload failed: ${error.message}`));
          if (!result?.secure_url) return reject(new InternalServerErrorException('Cloudinary returned no URL'));
          this.logger.log(`Cloudinary upload success → ${result.secure_url}`);
          resolve(result.secure_url);
        },
      );
      fs.createReadStream(localPath).pipe(stream);
    });
  }
}