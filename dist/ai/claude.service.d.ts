import { ConfigService } from '@nestjs/config';
import { PromptService } from './prompt.service';
import type { TranscriptSegment, ParsedHook } from '../common/dto/analyze.dto';
export declare class ClaudeService {
    private readonly config;
    private readonly promptService;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService, promptService: PromptService);
    selectHooks(transcript: TranscriptSegment[], minDuration: number, maxDuration: number, maxRetries?: number): Promise<ParsedHook[]>;
    private parseHookResponse;
    private sleep;
}
