import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { VideoSource } from '../common/dto/analyze.dto';

const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
  }

  /**
   * Extract the 11-character video ID from any YouTube URL format.
   */
  extractVideoId(url: string): string {
    const match = url.match(YOUTUBE_URL_REGEX);
    if (!match?.[1]) {
      throw new BadRequestException(
        `Could not extract video ID from URL: ${url}. ` +
          `Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...`,
      );
    }
    return match[1];
  }

  /**
   * Check if a URL is a YouTube URL.
   */
  isYoutubeUrl(url: string): boolean {
    return YOUTUBE_URL_REGEX.test(url) || url.includes('youtube.com') || url.includes('youtu.be');
  }

  /**
   * Download a YouTube video using yt-dlp (subprocess).
   *
   * We use yt-dlp rather than ytdl-core because:
   *  - More reliable against YouTube rate limiting
   *  - Handles age-gated / member-only content better
   *  - Active development vs stale ytdl-core
   *
   * Returns VideoSource with local path and metadata.
   */
  async download(url: string): Promise<VideoSource> {
    const videoId = this.extractVideoId(url);
    const outputPath = path.join(
      this.uploadDir,
      `yt-${videoId}-${uuidv4().slice(0, 6)}.mp4`,
    );

    this.logger.log(`Downloading YouTube video ${videoId} → ${outputPath}`);

    // First: get metadata (title, duration) without downloading
    const metadata = await this.getMetadata(url);

    // Then: download best quality up to 1080p as mp4
    await this.runYtDlp([
      '--no-playlist',
      '--format',
      'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best',
      '--merge-output-format',
      'mp4',
      '--output',
      outputPath,
      '--no-warnings',
      '--quiet',
      url,
    ]);

    this.logger.log(`YouTube download complete: ${outputPath}`);

    return {
      localPath: outputPath,
      title: metadata.title,
      platform: 'youtube',
      sourceUrl: url,
      durationSeconds: metadata.duration,
    };
  }

  /**
   * Get YouTube video metadata without downloading.
   */
  async getMetadata(url: string): Promise<{ title: string; duration: number }> {
    const raw = await this.runYtDlp([
      '--no-playlist',
      '--dump-json',
      '--no-warnings',
      '--quiet',
      url,
    ]);

    try {
      const meta = JSON.parse(raw) as {
        title?: string;
        duration?: number;
        fulltitle?: string;
      };
      return {
        title: meta.title ?? meta.fulltitle ?? 'Untitled',
        duration: meta.duration ?? 0,
      };
    } catch {
      return { title: 'Untitled', duration: 0 };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Private
  // ─────────────────────────────────────────────────────────────────────────

  private runYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      // yt-dlp must be installed in the container (see Dockerfile)
      const proc = spawn('yt-dlp', args);

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      proc.stdout?.on('data', (d: Buffer) => stdoutChunks.push(d));
      proc.stderr?.on('data', (d: Buffer) => stderrChunks.push(d));

      proc.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new InternalServerErrorException(
              'yt-dlp not found. Please install it in the deployment environment.',
            ),
          );
        } else {
          reject(new InternalServerErrorException(`yt-dlp error: ${err.message}`));
        }
      });

      proc.on('close', (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
        const stderr = Buffer.concat(stderrChunks).toString('utf-8');

        if (code === 0) {
          resolve(stdout);
        } else {
          const stderrTail = stderr.split('\n').slice(-4).join('\n').trim();
          this.logger.error(`yt-dlp exit ${code}: ${stderrTail}`);

          // Provide actionable error messages based on common failures
          if (stderrTail.includes('Video unavailable')) {
            reject(
              new BadRequestException(
                'YouTube video is unavailable (private, deleted, or region-locked).',
              ),
            );
          } else if (stderrTail.includes('Sign in to confirm')) {
            reject(
              new BadRequestException(
                'YouTube requires sign-in for this video (age-gated content).',
              ),
            );
          } else {
            reject(
              new InternalServerErrorException(
                `YouTube download failed: ${stderrTail}`,
              ),
            );
          }
        }
      });
    });
  }
}
