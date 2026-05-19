import { ConfigService } from '@nestjs/config';
import type { TranscriptSegment } from './transcript.service';
export interface ParsedHook {
    rank: number;
    startTime: number;
    endTime: number;
    startSentence: string;
    endSentence: string;
    bridgeSentence: string;
    whySelected: string;
    hookScore: number;
}
export declare class ClaudeService {
    private readonly config;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService);
    selectHooks(segments: TranscriptSegment[], minDuration: number, maxDuration: number): Promise<ParsedHook[]>;
}
