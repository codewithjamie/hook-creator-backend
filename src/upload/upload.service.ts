import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import type { VideoSource } from '../common/dto/analyze.dto';

const renameAsync = promisify(fs.rename);
const mkdirAsync = promisify(fs.mkdir);

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
    mkdirAsync(this.uploadDir, { recursive: true }).catch(() => {});
  }

  /**
   * Process a multer-uploaded file:
   *  1. Generate a stable filename with UUID
   *  2. Move from multer temp location to our upload dir
   *  3. Return VideoSource metadata
   */
  async processUpload(file: Express.Multer.File): Promise<VideoSource> {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const safeName = `upload-${uuidv4()}${ext}`;
    const destPath = path.join(this.uploadDir, safeName);

    this.logger.log(
      `Processing upload: ${file.originalname} ` +
        `(${(file.size / 1024 / 1024).toFixed(1)} MB) → ${destPath}`,
    );

    if (file.path) {
      // Disk storage — move to our upload dir
      await renameAsync(file.path, destPath);
    } else if (file.buffer) {
      // Memory storage — write buffer
      await fs.promises.writeFile(destPath, file.buffer);
    } else {
      throw new Error('Multer file has neither path nor buffer — check multer configuration');
    }

    return {
      localPath: destPath,
      title: path.basename(file.originalname, ext),
      platform: 'upload',
    };
  }

  /**
   * Clean up an uploaded file after processing completes.
   */
  async cleanup(localPath: string): Promise<void> {
    try {
      await fs.promises.unlink(localPath);
      this.logger.debug(`Cleaned up uploaded file: ${localPath}`);
    } catch (err) {
      this.logger.warn(`Failed to cleanup ${localPath}: ${String(err)}`);
    }
  }
}
