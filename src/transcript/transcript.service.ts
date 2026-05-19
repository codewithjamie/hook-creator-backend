import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WhisperService } from './whisper.service';
import { OpenEdgeUtilsService } from '../hooks/openedge-utils.service';
import type { TranscriptSegment } from '../common/dto/analyze.dto';

export interface TranscriptResult {
  segments: TranscriptSegment[];
  source: 'youtube_captions' | 'whisper';
}

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(
    private readonly whisper: WhisperService,
    private readonly utils: OpenEdgeUtilsService,
  ) {}

  /**
   * Get transcript for a YouTube video.
   *
   * Priority order (mirrors Python openedge_utils.py):
   *  1. Manual captions (highest quality)
   *  2. Auto-generated captions
   *  3. Any available language
   *  4. Whisper fallback (if all above fail or quality check fails)
   */
  async fromYoutube(
    videoId: string,
    videoPath: string,
    forceSource?: 'youtube_captions' | 'whisper',
  ): Promise<TranscriptResult> {
    if (forceSource === 'whisper') {
      return this.fromWhisper(videoPath);
    }

    if (forceSource !== 'youtube_captions') {
      // Try YouTube captions first
      try {
        const result = await this.tryYoutubeCaptions(videoId);
        if (result) return result;
      } catch (err) {
        this.logger.warn(
          `YouTube captions failed for ${videoId}: ${String(err)}`,
        );
      }
    }

    if (forceSource === 'youtube_captions') {
      throw new UnprocessableEntityException(
        `YouTube captions not available for video ${videoId}. ` +
          `Try with transcript_source=auto to enable Whisper fallback.`,
      );
    }

    // Whisper fallback
    this.logger.log(
      `Falling back to Whisper for YouTube video ${videoId}`,
    );
    return this.fromWhisper(videoPath);
  }

  /**
   * Get transcript for a non-YouTube video (upload / Rumble / GDrive).
   * Always uses Whisper.
   */
  async fromWhisper(videoPath: string): Promise<TranscriptResult> {
    this.logger.log(`Transcribing via Whisper: ${videoPath}`);
    const segments = await this.whisper.transcribe(videoPath);

    const quality = this.utils.validateTranscriptQuality(segments);
    if (!quality.isValid) {
      throw new UnprocessableEntityException(
        `Whisper transcript quality check failed: ${quality.reason}`,
      );
    }

    this.logger.log(
      `Whisper transcript: ${segments.length} segments`,
    );
    return { segments, source: 'whisper' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Private
  // ─────────────────────────────────────────────────────────────────────────

  private async tryYoutubeCaptions(
    videoId: string,
  ): Promise<TranscriptResult | null> {
    // Dynamic import to avoid issues in environments without network
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { YoutubeTranscript } = require('youtube-transcript') as {
      YoutubeTranscript: {
        fetchTranscript: (
          id: string,
          opts?: { lang?: string },
        ) => Promise<Array<{ text: string; offset: number; duration: number }>>;
      };
    };

    const candidateLangs = ['en', 'en-US', 'en-GB'];
    let captions: Array<{ text: string; offset: number; duration: number }> | null = null;

    // Try manual captions in preferred languages first
    for (const lang of candidateLangs) {
      try {
        captions = await YoutubeTranscript.fetchTranscript(videoId, {
          lang,
        });
        this.logger.log(
          `YouTube captions fetched (lang=${lang}): ${captions.length} entries`,
        );
        break;
      } catch {
        // Try next language
      }
    }

    // Fallback: any language (YouTube auto-generated)
    if (!captions) {
      try {
        captions = await YoutubeTranscript.fetchTranscript(videoId);
        this.logger.log(
          `YouTube auto captions fetched: ${captions.length} entries`,
        );
      } catch {
        return null;
      }
    }

    if (!captions || captions.length === 0) return null;

    const segments = this.utils.mergeYoutubeCaptions(captions);
    const quality = this.utils.validateTranscriptQuality(segments);

    if (!quality.isValid) {
      this.logger.warn(
        `YouTube captions quality check failed: ${quality.reason} — will try Whisper`,
      );
      return null;
    }

    return { segments, source: 'youtube_captions' };
  }
}
