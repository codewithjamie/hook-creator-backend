import type { TranscriptSegment } from '../common/dto/analyze.dto';
export declare class PromptService {
    buildHookPrompt(transcript: TranscriptSegment[], minDuration: number, maxDuration: number): string;
    get hookSystemPrompt(): string;
}
