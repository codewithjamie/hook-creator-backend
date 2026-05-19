import { ConfigService } from '@nestjs/config';
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
export declare class TranscriptService {
    private readonly config;
    private readonly ffmpeg;
    private readonly logger;
    private readonly openai;
    constructor(config: ConfigService, ffmpeg: FfmpegService);
    fromYoutube(videoId: string): Promise<TranscriptResult | null>;
    fromWhisper(videoPath: string): Promise<TranscriptResult>;
    private mergeCaptions;
    private mergeWhisperSegments;
}
