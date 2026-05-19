import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import type { FfprobeData } from '../common/dto/analyze.dto';

// Resolve ffmpeg/ffprobe binaries — prefer env override, fallback to static
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegStatic = require('ffmpeg-static') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffprobeStatic = require('ffprobe-static') as { path: string };

const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private readonly uploadDir: string;
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
    this.ffmpegPath = config.get<string>('FFMPEG_PATH', '') || ffmpegStatic;
    this.ffprobePath =
      config.get<string>('FFPROBE_PATH', '') || ffprobeStatic.path;

    this.ensureUploadDir();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Probe a video file and return key metadata.
   */
  async probe(filePath: string): Promise<FfprobeData> {
    this.logger.debug(`Probing: ${filePath}`);

    const raw = await this.runCommand(this.ffprobePath, [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      filePath,
    ]);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new InternalServerErrorException(
        `ffprobe returned invalid JSON for: ${filePath}`,
      );
    }

    const streams = (parsed['streams'] as Record<string, unknown>[]) ?? [];
    const format = (parsed['format'] as Record<string, unknown>) ?? {};

    const videoStream = streams.find((s) => s['codec_type'] === 'video') ?? {};
    const audioStream = streams.find((s) => s['codec_type'] === 'audio');

    // Duration: prefer format-level, then stream-level
    const durationRaw =
      (format['duration'] as string | undefined) ??
      (videoStream['duration'] as string | undefined) ??
      '0';
    const durationSeconds = parseFloat(durationRaw);

    // FPS: stored as "30000/1001" fraction
    const fpsRaw =
      (videoStream['r_frame_rate'] as string | undefined) ?? '30/1';
    const [fpsNum, fpsDen] = fpsRaw.split('/').map(Number);
    const fps = fpsDen > 0 ? fpsNum / fpsDen : 30;

    return {
      durationSeconds,
      width: parseInt((videoStream['width'] as string | undefined) ?? '0', 10),
      height: parseInt((videoStream['height'] as string | undefined) ?? '0', 10),
      fps,
      hasAudio: audioStream !== undefined,
    };
  }

  /**
   * Extract a clip from startTime → endTime into a new temp file.
   * Uses stream copy for speed (no re-encode at this stage).
   */
  async extractClip(
    sourcePath: string,
    startTime: number,
    endTime: number,
  ): Promise<string> {
    const duration = endTime - startTime;
    const outputPath = this.tempPath(`hook-${uuidv4()}.mp4`);

    this.logger.log(
      `Extracting clip [${startTime}s → ${endTime}s] (${duration.toFixed(2)}s)`,
    );

    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-ss',
      String(startTime),
      '-i',
      sourcePath,
      '-t',
      String(duration),
      // Re-encode to ensure clean keyframes at boundaries
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      outputPath,
    ]);

    return outputPath;
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   *  CROSSFADE MERGE — The core feature.
   *
   *  Creates a seamless dissolve from the end of the hook clip into the
   *  beginning of the full source video using FFmpeg's xfade / acrossfade.
   *
   *  Algorithm:
   *    1. Probe hookPath to get its exact duration (dynamic, not assumed).
   *    2. xfade offset = hookDuration - 0.5
   *       (crossfade starts 0.5 s before hook ends → overlaps with full video)
   *    3. Apply xfade=dissolve to video + acrossfade to audio.
   *    4. Re-encode with libx264/aac — no stream copy possible with xfade.
   *
   *  Output: a single MP4 where hook dissolves naturally into full video.
   * ─────────────────────────────────────────────────────────────────────────
   */
  async mergeWithCrossfade(
    hookPath: string,
    fullVideoPath: string,
  ): Promise<string> {
    const outputPath = this.tempPath(`merged-${uuidv4()}.mp4`);

    // Step 1: Get accurate hook duration via ffprobe
    const hookProbe = await this.probe(hookPath);
    const hookDuration = hookProbe.durationSeconds;

    if (hookDuration < 1) {
      throw new InternalServerErrorException(
        `Hook clip is too short (${hookDuration.toFixed(2)}s) to apply crossfade.`,
      );
    }

    // Step 2: Calculate xfade offset
    const crossfadeDuration = 0.5;
    const xfadeOffset = Math.max(0, hookDuration - crossfadeDuration);

    this.logger.log(
      `Crossfade merge: hook=${hookDuration.toFixed(3)}s, ` +
        `xfadeOffset=${xfadeOffset.toFixed(3)}s, ` +
        `crossfadeDuration=${crossfadeDuration}s`,
    );

    // Step 3: Build the filter_complex for xfade + acrossfade
    //
    //  [0:v][1:v] xfade=dissolve: hook→full video dissolve
    //  [0:a][1:a] acrossfade:     exponential fade-out / fade-in on audio
    //
    const filterComplex = [
      `[0:v][1:v]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${xfadeOffset}[v]`,
      `[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[a]`,
    ].join(';');

    await this.runCommand(this.ffmpegPath, [
      '-y',
      // Input 0: hook clip
      '-i',
      hookPath,
      // Input 1: full source video
      '-i',
      fullVideoPath,
      // Filter graph
      '-filter_complex',
      filterComplex,
      // Map our named streams
      '-map',
      '[v]',
      '-map',
      '[a]',
      // Video codec: libx264 (required — xfade cannot stream-copy)
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '23',
      '-profile:v',
      'high',
      '-level',
      '4.1',
      // Audio codec
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      // Ensure web-compatible fast-start
      '-movflags',
      '+faststart',
      outputPath,
    ]);

    this.logger.log(`Crossfade merge complete → ${outputPath}`);
    return outputPath;
  }

  /**
   * Ensure audio stream exists — pad with silent audio if video has no audio.
   * Some downloads arrive without an audio track and would break acrossfade.
   */
  async ensureAudioTrack(sourcePath: string): Promise<string> {
    const probe = await this.probe(sourcePath);
    if (probe.hasAudio) return sourcePath;

    this.logger.warn(
      `Video has no audio track — adding silent audio: ${sourcePath}`,
    );

    const outputPath = this.tempPath(`audio-padded-${uuidv4()}.mp4`);
    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-i',
      sourcePath,
      '-f',
      'lavfi',
      '-i',
      `aevalsrc=0:c=stereo:r=44100:d=${probe.durationSeconds}`,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-shortest',
      outputPath,
    ]);

    return outputPath;
  }

  /**
   * Clean up a list of temp files — swallows errors so pipeline failures
   * don't mask the original error.
   */
  async cleanup(...filePaths: Array<string | undefined>): Promise<void> {
    await Promise.allSettled(
      filePaths
        .filter((p): p is string => typeof p === 'string')
        .map(async (p) => {
          try {
            if (await existsAsync(p)) await unlinkAsync(p);
          } catch (err) {
            this.logger.warn(`Failed to delete temp file ${p}: ${String(err)}`);
          }
        }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Private Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private tempPath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  private async ensureUploadDir(): Promise<void> {
    await mkdirAsync(this.uploadDir, { recursive: true }).catch(() => {
      // Dir already exists — not an error
    });
  }

  /**
   * Generic command runner.
   * Resolves with stdout, rejects with a descriptive error on non-zero exit.
   */
  private runCommand(
    binary: string,
    args: string[],
    options?: SpawnOptionsWithoutStdio,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const cmd = spawn(binary, args, {
        ...options,
        env: { ...process.env },
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      cmd.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      cmd.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      cmd.on('error', (err) => {
        reject(
          new InternalServerErrorException(
            `Failed to spawn ${path.basename(binary)}: ${err.message}`,
          ),
        );
      });

      cmd.on('close', (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
        const stderr = Buffer.concat(stderrChunks).toString('utf-8');

        if (code === 0) {
          resolve(stdout);
        } else {
          // Capture the last 2 lines of stderr which usually has the real error
          const stderrTail = stderr.split('\n').slice(-3).join('\n').trim();
          this.logger.error(
            `${path.basename(binary)} exited ${code}: ${stderrTail}`,
          );
          reject(
            new InternalServerErrorException(
              `FFmpeg error (exit ${code}): ${stderrTail}`,
            ),
          );
        }
      });
    });
  }
}
