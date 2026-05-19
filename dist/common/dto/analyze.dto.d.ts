export declare class HookDto {
    rank: number;
    startTime: number;
    endTime: number;
    bridgeSentence: string;
    whySelected: string;
    hookScore: number;
    startSentence: string;
    endSentence: string;
}
export declare class AnalyzeRequestDto {
    video_url?: string;
    min_hook_duration?: number;
    max_hook_duration?: number;
    transcript_source?: 'auto' | 'youtube_captions' | 'whisper';
}
export declare class AnalyzeResponse {
    clipUrl: string;
    startTime: number;
    endTime: number;
    bridgeSentence: string;
    whySelected: string;
    hookScore: number;
    transcriptSource: 'youtube_captions' | 'whisper';
    fullHooks: HookDto[];
    meta: AnalyzeMeta;
}
export declare class AnalyzeMeta {
    processingTimeMs: number;
    videoTitle?: string;
    platform: 'youtube' | 'rumble' | 'google_drive' | 'upload' | 'url';
    videoDurationSeconds?: number;
}
export interface TranscriptSegment {
    start: number;
    text: string;
}
export interface VideoSource {
    localPath: string;
    title: string;
    platform: 'youtube' | 'rumble' | 'google_drive' | 'upload' | 'url';
    sourceUrl?: string;
    durationSeconds?: number;
}
export interface ParsedHook {
    rank: number;
    startTime: number;
    endTime: number;
    bridgeSentence: string;
    whySelected: string;
    hookScore: number;
    startSentence: string;
    endSentence: string;
}
export interface FfprobeData {
    durationSeconds: number;
    width: number;
    height: number;
    fps: number;
    hasAudio: boolean;
}
