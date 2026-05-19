import { ConfigService } from '@nestjs/config';
import type { TranscriptSegment } from '../common/dto/analyze.dto';
import { OpenEdgeUtilsService } from '../hooks/openedge-utils.service';
export declare class WhisperService {
    private readonly config;
    private readonly utils;
    private readonly logger;
    private readonly openai;
    private readonly uploadDir;
    private readonly chunkDuration;
    constructor(config: ConfigService, utils: OpenEdgeUtilsService);
    transcribe(videoPath: string): Promise<TranscriptSegment[]>;
    private transcribeFile;
    private transcribeInChunks;
    private extractAudio;
    private splitAudio;
}
