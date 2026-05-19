import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import type { TranscriptSegment } from '../common/dto/analyze.dto';
import { OpenEdgeUtilsService } from '../hooks/openedge-utils.service';

// Whisper has a 25 MB file size limit — we chunk large files via FFmpeg
const WHISPER_MAX_BYTES = 24 * 1024 * 1024; // 24 MB to be safe

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly openai: OpenAI;
  private readonly uploadDir: string;
  private readonly chunkDuration: number;

  constructor(
    private readonly config: ConfigService,
    private readonly utils: OpenEdgeUtilsService,
  ) {
    this.openai = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
    this.chunkDuration = config.get<number>(
      'WHISPER_CHUNK_DURATION_SECONDS',
      600,
    );
  }

  /**
   * Transcribe a video file using OpenAI Whisper.
   *
   * For files over 24 MB:
   *  1. Extract audio-only stream to MP3 (reduces size significantly)
   *  2. If still too large, split into time-based chunks
   *  3. Transcribe each chunk and merge with time offset correction
   */
  async transcribe(videoPath: string): Promise<TranscriptSegment[]> {
    this.logger.log(`Starting Whisper transcription: ${videoPath}`);

    // Step 1: Extract audio to MP3 (far smaller than video)
    const audioPath = await this.extractAudio(videoPath);

    try {
      const stat = fs.statSync(audioPath);

      if (stat.size <= WHISPER_MAX_BYTES) {
        // Small enough — transcribe directly
        return await this.transcribeFile(audioPath, 0);
      } else {
        // Large file — chunk it
        this.logger.log(
          `Audio too large (${(stat.size / 1024 / 1024).toFixed(1)} MB) ` +
            `— splitting into ${this.chunkDuration}s chunks`,
        );
        return await this.transcribeInChunks(audioPath);
      }
    } finally {
      // Clean up extracted audio
      fs.unlink(audioPath, () => {});
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Private
  // ─────────────────────────────────────────────────────────────────────────

  private async transcribeFile(
    audioPath: string,
    timeOffset: number,
  ): Promise<TranscriptSegment[]> {
    this.logger.debug(`Whisper API call: ${audioPath} (offset: ${timeOffset}s)`);

    const file = fs.createReadStream(audioPath);

    const response = await this.openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const rawSegments = (
      response as unknown as {
        segments: Array<{ start: number; end: number; text: string }>;
      }
    ).segments ?? [];

    // Apply time offset for chunks
    const offsetSegments = rawSegments.map((s) => ({
      start: s.start + timeOffset,
      end: s.end + timeOffset,
      text: s.text,
    }));

    return this.utils.mergeWhisperToSentences(offsetSegments);
  }

  private async transcribeInChunks(
    audioPath: string,
  ): Promise<TranscriptSegment[]> {
    const chunks = await this.splitAudio(audioPath);
    const allSegments: TranscriptSegment[] = [];
    let offset = 0;

    try {
      for (let i = 0; i < chunks.length; i++) {
        this.logger.log(
          `Transcribing chunk ${i + 1}/${chunks.length} (offset: ${offset}s)`,
        );
        const segments = await this.transcribeFile(chunks[i], offset);
        allSegments.push(...segments);
        offset += this.chunkDuration;
      }
    } finally {
      // Cleanup chunk files
      chunks.forEach((c) => fs.unlink(c, () => {}));
    }

    return allSegments;
  }

  /**
   * Extract audio from a video file as MP3 using ffmpeg.
   * MP3 is ~10x smaller than video, staying under Whisper's 25 MB limit.
   */
  private extractAudio(videoPath: string): Promise<string> {
    const outputPath = path.join(
      this.uploadDir,
      `audio-${uuidv4()}.mp3`,
    );

    return new Promise((resolve, reject) => {
      const ffmpegPath =
        this.config.get<string>('FFMPEG_PATH') ||
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('ffmpeg-static') as string);

      const proc = spawn(ffmpegPath, [
        '-y',
        '-i',
        videoPath,
        '-vn',               // No video
        '-ar',
        '16000',             // 16 kHz — sufficient for speech
        '-ac',
        '1',                 // Mono
        '-b:a',
        '64k',               // Low bitrate — speech doesn't need hi-fi
        outputPath,
      ]);

      proc.on('close', (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new InternalServerErrorException('FFmpeg audio extraction failed'));
      });

      proc.on('error', reject);
    });
  }

  /**
   * Split audio into fixed-duration chunks.
   * Returns paths to chunk files.
   */
  private splitAudio(audioPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const chunkPattern = path.join(
        this.uploadDir,
        `chunk-${uuidv4()}-%03d.mp3`,
      );

      const ffmpegPath =
        this.config.get<string>('FFMPEG_PATH') ||
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('ffmpeg-static') as string);

      const proc = spawn(ffmpegPath, [
        '-y',
        '-i',
        audioPath,
        '-f',
        'segment',
        '-segment_time',
        String(this.chunkDuration),
        '-c',
        'copy',
        chunkPattern,
      ]);

      const stderrBuf: Buffer[] = [];
      proc.stderr?.on('data', (d: Buffer) => stderrBuf.push(d));

      proc.on('close', (code) => {
        if (code !== 0) {
          const msg = Buffer.concat(stderrBuf).toString().slice(-200);
          return reject(
            new InternalServerErrorException(
              `FFmpeg chunk split failed: ${msg}`,
            ),
          );
        }

        // Find all generated chunk files
        const dir = path.dirname(chunkPattern);
        const prefix = path.basename(chunkPattern).replace('-%03d.mp3', '');
        const files = fs
          .readdirSync(dir)
          .filter((f) => f.startsWith(prefix) && f.endsWith('.mp3'))
          .sort()
          .map((f) => path.join(dir, f));

        resolve(files);
      });

      proc.on('error', reject);
    });
  }
}
