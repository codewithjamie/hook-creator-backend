import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const ffmpegStatic = require('ffmpeg-static') as string;

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);
  private readonly uploadDir: string;
  private readonly ffmpegPath: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
    this.ffmpegPath = config.get<string>('FFMPEG_PATH', '') || ffmpegStatic;
  }

  async addWatermark(inputPath: string): Promise<string> {
    const outputPath = path.join(this.uploadDir, `watermarked-${uuidv4()}.mp4`);

    this.logger.log(`Adding watermark → ${outputPath}`);

    await this.runCommand(this.ffmpegPath, [
        '-y',
        '-i', inputPath,
        // Generate a solid color rectangle as second input
        '-f', 'lavfi',
        '-i', 'color=c=black@0.5:size=160x34:rate=30',
        '-filter_complex',
        // Overlay the dark box at bottom-right corner of video
        `[1:v]format=rgba,colorchannelmixer=aa=0.55[box];` +
        `[0:v][box]overlay=x=W-w-10:y=H-h-10:shortest=1[vout]`,
        '-map', '[vout]',
        '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'copy',
        outputPath,
    ]);

    this.logger.log(`Watermark applied → ${outputPath}`);
    return outputPath;
    }

  private runCommand(binary: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(binary, args);
      const err: Buffer[] = [];
      proc.stderr?.on('data', (d: Buffer) => err.push(d));
      proc.on('close', (code) => {
        if (code === 0) return resolve();
        const msg = Buffer.concat(err).toString().split('\n').slice(-3).join('\n');
        reject(new Error(`FFmpeg watermark error: ${msg}`));
      });
      proc.on('error', (e) => reject(new Error(`FFmpeg spawn error: ${e.message}`)));
    });
  }
}