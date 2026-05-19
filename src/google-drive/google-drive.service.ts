import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { VideoSource } from '../common/dto/analyze.dto';

const GDRIVE_REGEX =
  /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=))([a-zA-Z0-9_-]{25,})/;

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
  }

  isGoogleDriveUrl(url: string): boolean {
    return GDRIVE_REGEX.test(url);
  }

  extractFileId(url: string): string {
    const match = url.match(GDRIVE_REGEX);
    if (!match?.[1]) {
      throw new BadRequestException(
        `Could not extract Google Drive file ID from: ${url}`,
      );
    }
    return match[1];
  }

  /**
   * Download a public Google Drive video file.
   *
   * Note: Requires the file to be publicly shared ("Anyone with the link").
   * Google Drive sends a "confirm" cookie for large files — we handle that.
   */
  async download(url: string): Promise<VideoSource> {
    const fileId = this.extractFileId(url);
    const outputPath = path.join(
      this.uploadDir,
      `gdrive-${uuidv4()}.mp4`,
    );

    this.logger.log(`Downloading Google Drive file ${fileId} → ${outputPath}`);

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    try {
      // First request — may return a confirmation page for large files
      const firstResponse = await axios.get<Buffer>(downloadUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; OpenEdge/2.0; +https://openedge.ai)',
        },
      });

      let videoBuffer: Buffer;
      const contentType = firstResponse.headers['content-type'] as string ?? '';

      if (contentType.includes('text/html')) {
        // Google Drive large-file confirmation — extract confirm token
        const html = firstResponse.data.toString('utf-8');
        const confirmMatch = html.match(/confirm=([0-9A-Za-z_]+)/);
        if (!confirmMatch) {
          throw new BadRequestException(
            'Google Drive file requires sign-in or is not publicly shared.',
          );
        }

        const confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmMatch[1]}`;
        const confirmResponse = await axios.get<Buffer>(confirmUrl, {
          responseType: 'arraybuffer',
          maxRedirects: 5,
        });
        videoBuffer = Buffer.from(confirmResponse.data);
      } else {
        videoBuffer = Buffer.from(firstResponse.data);
      }

      await fs.promises.writeFile(outputPath, videoBuffer);
      this.logger.log(
        `Google Drive download complete: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`,
      );

      return {
        localPath: outputPath,
        title: `GDrive-${fileId}`,
        platform: 'google_drive',
        sourceUrl: url,
      };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new BadRequestException(
          `Failed to download Google Drive file: ${err.message}. ` +
            `Ensure the file is publicly shared.`,
        );
      }
      throw new InternalServerErrorException(String(err));
    }
  }
}
