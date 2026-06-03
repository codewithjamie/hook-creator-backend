import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import { FfmpegService } from './ffmpeg.service';

export interface TranscriptSegment {
  start: number;
  text: string;
  duration?: number;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  source: 'youtube_captions' | 'whisper';
}

type CaptionItem = { text: string; offset: number; duration: number };

interface SupadataSegment {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}

interface SupadataResponse {
  content: SupadataSegment[] | string;
  lang?: string;
  availableLangs?: string[];
}

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);
  private readonly openai: OpenAI;
  private readonly supadataKey: string | null;

  constructor(
    private readonly config: ConfigService,
    private readonly ffmpeg: FfmpegService,
  ) {
    this.openai = new OpenAI({ apiKey: config.getOrThrow<string>('OPENAI_API_KEY') });
    this.supadataKey = config.get<string>('SUPADATA_API_KEY') ?? null;

    if (this.supadataKey) {
      this.logger.log('Supadata API configured ✅');
    } else {
      this.logger.warn('SUPADATA_API_KEY not set — falling back to youtube-transcript library');
    }
  }

  async fromYoutube(videoId: string): Promise<TranscriptResult | null> {
    // ── 1. Try Supadata first (most reliable, no IP issues) ──────────────────
    if (this.supadataKey) {
      const result = await this.fromSupadata(videoId);
      if (result) return result;
    }

    // ── 2. Fall back to youtube-transcript library ───────────────────────────
    return await this.fromYoutubeTranscriptLib(videoId);
  }

  // ── Supadata API ────────────────────────────────────────────────────────────
  private async fromSupadata(videoId: string): Promise<TranscriptResult | null> {
    try {
      this.logger.log(`Supadata: fetching transcript for ${videoId}`);

      const res = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=false`,
        {
          headers: {
            'x-api-key': this.supadataKey!,
            'Accept': 'application/json',
          },
        },
      );

      if (!res.ok) {
        this.logger.warn(`Supadata returned ${res.status} — falling back`);
        return null;
      }

      const data = await res.json() as SupadataResponse;

      // content can be an array of segments or a plain string
      if (!data.content) return null;

      let segments: TranscriptSegment[];

      if (Array.isArray(data.content)) {
        if (!data.content.length) return null;
        segments = this.mergeCaptions(
          data.content.map((s) => ({
            text: s.text,
            offset: s.offset,   // already in ms
            duration: s.duration,
          })),
        );
      } else if (typeof data.content === 'string' && data.content.trim()) {
        // Plain text fallback — treat as single segment
        segments = [{ start: 0, text: data.content.trim() }];
      } else {
        return null;
      }

      this.logger.log(`Supadata: ${segments.length} segments (lang=${data.lang ?? 'unknown'})`);
      return { segments, source: 'youtube_captions' };
    } catch (err) {
      this.logger.warn(`Supadata failed: ${String(err)} — falling back`);
      return null;
    }
  }

  // ── youtube-transcript library (original fallback) ──────────────────────────
  private async fromYoutubeTranscriptLib(videoId: string): Promise<TranscriptResult | null> {
    try {
      type YoutubeTranscriptLib = {
        YoutubeTranscript: {
          fetchTranscript: (id: string, opts?: { lang?: string }) => Promise<CaptionItem[]>;
        };
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { YoutubeTranscript } = require('youtube-transcript') as YoutubeTranscriptLib;

      let captions: CaptionItem[] | null = null;

      for (const lang of ['en', 'en-US', 'en-GB']) {
        try {
          const result = await YoutubeTranscript.fetchTranscript(videoId, { lang });
          if (result?.length) { captions = result; break; }
        } catch {
          // try next language
        }
      }

      if (!captions?.length) {
        captions = await YoutubeTranscript.fetchTranscript(videoId);
      }

      if (!captions?.length) return null;

      const segments = this.mergeCaptions(captions);
      this.logger.log(`YouTube captions (lib): ${segments.length} segments`);
      return { segments, source: 'youtube_captions' };
    } catch (err) {
      this.logger.warn(`YouTube captions failed: ${String(err)}`);
      return null;
    }
  }

  // ── Whisper ─────────────────────────────────────────────────────────────────
  // async fromWhisper(videoPath: string): Promise<TranscriptResult> {
  //   this.logger.log(`Whisper transcription: ${videoPath}`);
  //   const audioPath = await this.ffmpeg.extractAudioMp3(videoPath);

  //   try {
  //     const stat = fs.statSync(audioPath);
  //     this.logger.log(`Audio extracted: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);

  //     const response = await this.openai.audio.transcriptions.create({
  //       model: 'whisper-1',
  //       file: fs.createReadStream(audioPath),
  //       response_format: 'verbose_json',
  //       timestamp_granularities: ['segment'],
  //     }) as unknown as {
  //       segments: Array<{ start: number; end: number; text: string }>;
  //     };

  //     const segments = this.mergeWhisperSegments(response.segments ?? []);
  //     this.logger.log(`Whisper: ${segments.length} segments`);
  //     return { segments, source: 'whisper' };
  //   } finally {
  //     this.ffmpeg.cleanup(audioPath);
  //   }
  // }

  async fromWhisper(videoPath: string): Promise<TranscriptResult> {
    this.logger.log(`Whisper transcription: ${videoPath}`);
    const audioPath = await this.ffmpeg.extractAudioMp3(videoPath);

    try {
      const stat = fs.statSync(audioPath);
      this.logger.log(`Audio extracted: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);

      const response = await this.openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(audioPath),
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      }) as unknown as {
        segments: Array<{ start: number; end: number; text: string }>;
      };

      const segments = this.mergeWhisperSegments(response.segments ?? []);
      this.logger.log(`Whisper: ${segments.length} segments`);

      // Return empty segments — caller will handle fallback
      return { segments, source: 'whisper' };
    } catch (err) {
      this.logger.warn(`Whisper failed: ${String(err)} — returning empty transcript`);
      return { segments: [], source: 'whisper' };
    } finally {
      this.ffmpeg.cleanup(audioPath);
    }
  }

  // Generate evenly-spaced synthetic segments from video duration
  generateDurationBasedSegments(
    durationSeconds: number,
    hookDuration = 10,
  ): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const interval = Math.max(hookDuration, durationSeconds / 6);

    for (let start = 0; start + hookDuration <= durationSeconds; start += interval) {
      segments.push({
        start: Math.round(start * 10) / 10,
        text: `[No speech detected] Video segment at ${Math.floor(start / 60)}:${String(Math.floor(start % 60)).padStart(2, '0')}`,
        duration: hookDuration * 1000,
      });
    }

    return segments.slice(0, 6);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private mergeCaptions(captions: CaptionItem[]): TranscriptSegment[] {
    const result: TranscriptSegment[] = [];
    let current = '';
    let start: number | null = null;
    const SENTENCE_END = /[.!?]\s*$/;

    for (const c of captions) {
      const text = c.text.replace(/\[.*?\]/g, '').trim();
      if (!text) continue;
      if (start === null) start = c.offset / 1000;
      current += (current ? ' ' : '') + text;
      if (SENTENCE_END.test(current)) {
        result.push({ start: start!, text: current.trim() });
        current = '';
        start = null;
      }
    }

    if (current.trim() && start !== null) {
      result.push({ start, text: current.trim() });
    }

    return result;
  }

  private mergeWhisperSegments(
    segs: Array<{ start: number; end: number; text: string }>,
  ): TranscriptSegment[] {
    return this.mergeCaptions(
      segs.map((s) => ({
        text: s.text,
        offset: s.start * 1000,
        duration: (s.end - s.start) * 1000,
      })),
    );
  }
}