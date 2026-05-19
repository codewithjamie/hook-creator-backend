import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FfmpegService } from './ffmpeg.service';
import { CloudinaryService } from './cloudinary.service';
import type { ParsedHook } from '../common/dto/analyze.dto';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessedClip {
  cloudinaryUrl: string;
  localMergedPath: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly ffmpeg: FfmpegService,
    private readonly cloudinary: CloudinaryService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Full pipeline:
   *  1. Extract hook clip from source video
   *  2. Ensure both inputs have audio tracks (pad with silence if not)
   *  3. Merge hook + full video with 0.5 s xfade dissolve crossfade
   *  4. Upload merged MP4 to Cloudinary
   *  5. Clean up all temp files
   *
   * Returns the Cloudinary URL.
   */
  async createCrossfadeClip(
    sourceVideoPath: string,
    hook: ParsedHook,
  ): Promise<ProcessedClip> {
    const jobId = uuidv4().slice(0, 8);
    this.logger.log(
      `[${jobId}] Creating crossfade clip ` +
        `[${hook.startTime}s → ${hook.endTime}s]`,
    );

    let hookPath: string | undefined;
    let audioSafeSourcePath: string | undefined;
    let audioSafeHookPath: string | undefined;
    let mergedPath: string | undefined;

    try {
      // ── Step 1: Extract the hook segment ─────────────────────────────────
      hookPath = await this.ffmpeg.extractClip(
        sourceVideoPath,
        hook.startTime,
        hook.endTime,
      );
      this.logger.debug(`[${jobId}] Hook extracted → ${hookPath}`);

      // ── Step 2: Ensure audio tracks (required for acrossfade) ─────────────
      audioSafeHookPath = await this.ffmpeg.ensureAudioTrack(hookPath);
      audioSafeSourcePath = await this.ffmpeg.ensureAudioTrack(sourceVideoPath);

      // ── Step 3: xfade crossfade merge ─────────────────────────────────────
      mergedPath = await this.ffmpeg.mergeWithCrossfade(
        audioSafeHookPath,
        audioSafeSourcePath,
      );
      this.logger.debug(`[${jobId}] Crossfade merge complete → ${mergedPath}`);

      // ── Step 4: Upload to Cloudinary ──────────────────────────────────────
      const publicId = `openedge/${jobId}`;
      const cloudinaryUrl = await this.cloudinary.uploadVideo(
        mergedPath,
        publicId,
      );

      return { cloudinaryUrl, localMergedPath: mergedPath };
    } finally {
      // ── Step 5: Cleanup intermediates (not the merged file — caller cleans) ──
      const toDelete: Array<string | undefined> = [hookPath];

      // Only delete padded copies if they differ from originals
      if (audioSafeHookPath && audioSafeHookPath !== hookPath) {
        toDelete.push(audioSafeHookPath);
      }
      if (audioSafeSourcePath && audioSafeSourcePath !== sourceVideoPath) {
        toDelete.push(audioSafeSourcePath);
      }

      await this.ffmpeg.cleanup(...toDelete);
    }
  }
}
