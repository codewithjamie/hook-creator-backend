import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideoDownloaderService {
  private readonly logger = new Logger(VideoDownloaderService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async download(url: string): Promise<string> {
    const outputPath = path.join(this.uploadDir, `video-${uuidv4()}.mp4`);
    this.logger.log(`Downloading video → ${outputPath}`);

    await this.runYtDlp([
        '--no-playlist',
        '--format', 'best[height<=720][ext=mp4]/best[height<=720]/best',  // 720p max — faster
        '--output', outputPath,
        '--no-warnings',
        '--socket-timeout', '30',       // 30s socket timeout
        '--retries', '3',               // only 3 retries
        '--fragment-retries', '3',
        url,
    ]);

    this.logger.log(`Download complete → ${outputPath}`);
    return outputPath;
  }

  async cleanup(...paths: string[]): Promise<void> {
    for (const p of paths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {}
    }
  }

  private runYtDlp(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', args);
      const err: Buffer[] = [];
      proc.stderr?.on('data', (d: Buffer) => err.push(d));
      proc.on('close', (code) => {
        if (code === 0) return resolve();
        const msg = Buffer.concat(err).toString().split('\n').slice(-3).join('\n');
        reject(new InternalServerErrorException(`yt-dlp failed: ${msg}`));
      });
      proc.on('error', () =>
        reject(new InternalServerErrorException('yt-dlp not found. Install it in PATH.')),
      );
    });
  }
}