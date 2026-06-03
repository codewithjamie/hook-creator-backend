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

    // Draws "OpenEdge" text in bottom-right corner, semi-transparent white
    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-i', inputPath,
      '-vf',
      [
        // Semi-transparent dark box behind text
        `drawbox=x=iw-220:y=ih-50:w=210:h=40:color=black@0.4:t=fill`,
        // OpenEdge text
        `drawtext=text='OpenEdge':` +
          `fontcolor=white@0.85:` +
          `fontsize=22:` +
          `x=iw-210:` +
          `y=ih-38:` +
          `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
      ].join(','),
      '-codec:a', 'copy',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
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