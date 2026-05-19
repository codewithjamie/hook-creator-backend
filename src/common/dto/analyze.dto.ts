import {
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ─────────────────────────────────────────────────────────────────────────────
//  Hook DTO
// ─────────────────────────────────────────────────────────────────────────────

export class HookDto {
  @IsNumber()
  rank: number;

  @IsNumber()
  @Min(0)
  startTime: number;

  @IsNumber()
  @Min(0)
  endTime: number;

  @IsString()
  bridgeSentence: string;

  @IsString()
  whySelected: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  hookScore: number;

  @IsString()
  startSentence: string;

  @IsString()
  endSentence: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Analyze Request DTO
// ─────────────────────────────────────────────────────────────────────────────

export class AnalyzeRequestDto {
  /**
   * YouTube / Rumble / direct video URL.
   * Provide this OR `videoFile` — not both.
   */
  @IsOptional()
  @IsString()
  video_url?: string;

  /**
   * Hook duration constraints (seconds).
   * Defaults pulled from config if omitted.
   */
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(30)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  min_hook_duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  max_hook_duration?: number;

  /**
   * Force a specific transcript source instead of auto-detect.
   */
  @IsOptional()
  @IsEnum(['auto', 'youtube_captions', 'whisper'])
  transcript_source?: 'auto' | 'youtube_captions' | 'whisper';
}

// ─────────────────────────────────────────────────────────────────────────────
//  Analyze Response DTO
// ─────────────────────────────────────────────────────────────────────────────

export class AnalyzeResponse {
  /** Cloudinary URL of the final crossfade MP4 */
  clipUrl: string;

  /** Best hook start time in seconds */
  startTime: number;

  /** Best hook end time in seconds */
  endTime: number;

  /** Claude-generated bridge sentence */
  bridgeSentence: string;

  /** Claude's reasoning for this hook choice */
  whySelected: string;

  /** Weighted hook quality score 0–100 */
  hookScore: number;

  /** Where the transcript came from */
  transcriptSource: 'youtube_captions' | 'whisper';

  /** All 6 ranked hooks from Claude */
  fullHooks: HookDto[];

  /** Processing metadata */
  meta: AnalyzeMeta;
}

export class AnalyzeMeta {
  /** Total wall-clock time for this request (ms) */
  processingTimeMs: number;

  /** Video title if available */
  videoTitle?: string;

  /** Source platform */
  platform: 'youtube' | 'rumble' | 'google_drive' | 'upload' | 'url';

  /** Duration of source video in seconds */
  videoDurationSeconds?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Internal Pipeline Types (not exposed in HTTP layer)
// ─────────────────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  /** Start time in seconds */
  start: number;
  /** Full sentence text */
  text: string;
}

export interface VideoSource {
  /** Absolute local path to the downloaded/uploaded video */
  localPath: string;
  /** Human-readable title */
  title: string;
  /** Detected platform */
  platform: 'youtube' | 'rumble' | 'google_drive' | 'upload' | 'url';
  /** Original URL if applicable */
  sourceUrl?: string;
  /** Duration in seconds, populated after ffprobe */
  durationSeconds?: number;
}

export interface ParsedHook {
  rank: number;
  startTime: number;
  endTime: number;
  bridgeSentence: string;
  whySelected: string;
  hookScore: number;
  startSentence: string;
  endSentence: string;
}

export interface FfprobeData {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
}
