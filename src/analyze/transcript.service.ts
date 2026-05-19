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

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly ffmpeg: FfmpegService,
  ) {
    this.openai = new OpenAI({ apiKey: config.getOrThrow<string>('OPENAI_API_KEY') });
  }

  async fromYoutube(videoId: string): Promise<TranscriptResult | null> {
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
          if (result?.length) {
            captions = result;
            break;
          }
        } catch {
          // try next language
        }
      }

      if (!captions?.length) {
        captions = await YoutubeTranscript.fetchTranscript(videoId);
      }

      if (!captions?.length) return null;

      const segments = this.mergeCaptions(captions);
      this.logger.log(`YouTube captions: ${segments.length} segments`);
      return { segments, source: 'youtube_captions' };
    } catch (err) {
      this.logger.warn(`YouTube captions failed: ${String(err)}`);
      return null;
    }
  }

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
      return { segments, source: 'whisper' };
    } finally {
      this.ffmpeg.cleanup(audioPath);
    }
  }

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