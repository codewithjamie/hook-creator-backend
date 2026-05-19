import { WhisperService } from './whisper.service';
import { OpenEdgeUtilsService } from '../hooks/openedge-utils.service';
import type { TranscriptSegment } from '../common/dto/analyze.dto';
export interface TranscriptResult {
    segments: TranscriptSegment[];
    source: 'youtube_captions' | 'whisper';
}
export declare class TranscriptService {
    private readonly whisper;
    private readonly utils;
    private readonly logger;
    constructor(whisper: WhisperService, utils: OpenEdgeUtilsService);
    fromYoutube(videoId: string, videoPath: string, forceSource?: 'youtube_captions' | 'whisper'): Promise<TranscriptResult>;
    fromWhisper(videoPath: string): Promise<TranscriptResult>;
    private tryYoutubeCaptions;
}
