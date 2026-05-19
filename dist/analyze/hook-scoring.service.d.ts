import { TranscriptSegment } from './transcript.service';
export interface HookCandidate {
    rank: number;
    hookScore: number;
    hookScoreLabel: string;
    hookScoreSummary: string;
    hookSummary: string;
    sceneTitle: string;
    startTime: number;
    endTime: number;
    duration: number;
    bridgeSentence: string;
    whySelected: string;
    clip: {
        url: string;
    } | null;
}
export interface ClaudeHooksResult {
    hooks: HookCandidate[];
    caption: string;
}
export declare class HookScoringService {
    private readonly logger;
    private _anthropic;
    private get anthropic();
    selectTopHooks(segments: TranscriptSegment[], minDuration?: number, maxDuration?: number, transcriptSource?: 'youtube_captions' | 'whisper'): Promise<ClaudeHooksResult>;
    private punctuateTranscript;
    private callHookPrompt;
    private callCaptionPrompt;
    private parseHooks;
    private extractHookText;
}
