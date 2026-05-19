export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}
export interface ClipInfo {
    publicId: string;
    watchUrl: string;
    downloadUrl: string;
    duration: number;
    format: string;
    sizeBytes: number;
}
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
    clip: ClipInfo | null;
}
export interface AnalyzeResponse {
    platform: string;
    platformLabel: string;
    platformIcon: string;
    videoTitle: string | null;
    hookScore: number;
    hookScoreLabel: string;
    hookScoreSummary: string;
    hookSummary: string;
    startTime: number;
    endTime: number;
    duration: number;
    bridgeSentence: string;
    whySelected: string;
    clip: ClipInfo | null;
    allHooks: HookCandidate[];
    caption: string;
    transcript: string;
    transcriptSource: 'youtube_captions' | 'whisper' | 'yt_dlp';
}
