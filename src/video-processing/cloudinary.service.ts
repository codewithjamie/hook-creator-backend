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

    this.logger.log(
      `Cloudinary configured — cloud: ${config.get('CLOUDINARY_CLOUD_NAME')}`,
    );
  }

  /**
   * Upload a local MP4 file to Cloudinary as a video resource.
   * Returns the secure HTTPS URL of the uploaded file.
   *
   * Uses upload_stream for memory efficiency — avoids loading large
   * files entirely into Node.js heap.
   */
  async uploadVideo(
    localPath: string,
    publicId?: string,
  ): Promise<string> {
    this.logger.log(`Uploading to Cloudinary: ${localPath}`);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: this.folder,
          public_id: publicId,
          overwrite: true,
          // Eager transforms for web delivery
          eager: [
            { format: 'mp4', quality: 'auto', fetch_format: 'auto' },
          ],
          eager_async: false,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(
              new InternalServerErrorException(
                `Failed to upload clip to Cloudinary: ${error.message}`,
              ),
            );
            return;
          }

          if (!result?.secure_url) {
            reject(
              new InternalServerErrorException(
                'Cloudinary returned no URL after upload.',
              ),
            );
            return;
          }

          this.logger.log(`Cloudinary upload success → ${result.secure_url}`);
          resolve(result.secure_url);
        },
      );

      // Pipe the file through stream instead of buffering
      const fileStream = fs.createReadStream(localPath);
      fileStream.on('error', (err) => {
        reject(
          new InternalServerErrorException(
            `Failed to read video file for upload: ${err.message}`,
          ),
        );
      });
      fileStream.pipe(stream);
    });
  }

  /**
   * Delete a Cloudinary asset by publicId. Used for cleanup on errors.
   */
  async deleteVideo(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    } catch (err) {
      this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${String(err)}`);
    }
  }
}
