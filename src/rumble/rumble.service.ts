import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { VideoSource } from '../common/dto/analyze.dto';

const RUMBLE_URL_REGEX = /rumble\.com\/(?:embed\/|v[a-z0-9]+|.*\/[a-z0-9-]+\.html)/i;

@Injectable()
export class RumbleService {
  private readonly logger = new Logger(RumbleService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
  }

  isRumbleUrl(url: string): boolean {
    return RUMBLE_URL_REGEX.test(url);
  }

  /**
   * Download a Rumble video using yt-dlp (which supports Rumble natively).
   */
  async download(url: string): Promise<VideoSource> {
    const outputPath = path.join(
      this.uploadDir,
      `rumble-${uuidv4()}.mp4`,
    );

    this.logger.log(`Downloading Rumble video → ${outputPath}`);

    await this.runYtDlp([
      '--format',
      'best[ext=mp4]/best',
      '--output',
      outputPath,
      '--no-warnings',
      '--quiet',
      url,
    ]);

    // Get title
    let title = 'Rumble Video';
    try {
      const metaRaw = await this.runYtDlp([
        '--dump-json', '--no-warnings', '--quiet', url,
      ]);
      const meta = JSON.parse(metaRaw) as { title?: string };
      title = meta.title ?? title;
    } catch {}

    return {
      localPath: outputPath,
      title,
      platform: 'rumble',
      sourceUrl: url,
    };
  }

  private runYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', args);
      const out: Buffer[] = [];
      const err: Buffer[] = [];

      proc.stdout?.on('data', (d: Buffer) => out.push(d));
      proc.stderr?.on('data', (d: Buffer) => err.push(d));

      proc.on('close', (code) => {
        if (code === 0) return resolve(Buffer.concat(out).toString());
        const msg = Buffer.concat(err).toString().split('\n').slice(-3).join('\n');
        reject(new BadRequestException(`Rumble download failed: ${msg}`));
      });

      proc.on('error', (e) => reject(e));
    });
  }
}
