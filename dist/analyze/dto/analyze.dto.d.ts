export declare class AnalyzeUrlDto {
    video_url: string;
    min_hook_duration?: number;
    max_hook_duration?: number;
    transcript_source?: 'auto' | 'youtube_captions' | 'whisper';
}
export declare class RebuildDto {
    analysisId: string;
    hookRank?: number;
}
export declare class ExtractClipDto {
    analysisId: string;
    startTime: number;
    endTime: number;
}
export declare class DetectPlatformResponse {
    platform: string;
    supported: boolean;
    videoId?: string;
}
export declare class HookDto {
    rank: number;
    startTime: number;
    endTime: number;
    bridgeSentence: string;
    whySelected: string;
    hookScore: number;
    startSentence: string;
    endSentence: string;
    clip: {
        url: string;
    } | null;
}
export declare class AnalysisResponse {
    id: string;
    status: string;
    clipUrl: string | null;
    startTime: number | null;
    endTime: number | null;
    bridgeSentence: string | null;
    whySelected: string | null;
    hookScore: number | null;
    transcriptSource: string | null;
    fullHooks: HookDto[] | null;
    creditsUsed: number;
    creditsRemaining: number;
    videoTitle: string | null;
    videoDurationSeconds: number | null;
    platform: string;
    sourceUrl: string | null;
    errorMessage: string | null;
    createdAt: Date;
}
export declare class HookOnlyDto {
    video_url: string;
    min_hook_duration?: number;
    max_hook_duration?: number;
    transcript_source?: 'auto' | 'youtube_captions' | 'whisper';
}
