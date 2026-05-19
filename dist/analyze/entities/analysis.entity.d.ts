import { UserEntity } from '../../users/entities/user.entity';
export type TranscriptSource = 'youtube_captions' | 'whisper';
export type AnalysisPlatform = 'youtube' | 'rumble' | 'google_drive' | 'upload';
export type AnalysisStatus = 'pending' | 'processing' | 'complete' | 'failed';
export declare class AnalysisEntity {
    id: string;
    sourceUrl: string | null;
    videoTitle: string | null;
    platform: AnalysisPlatform;
    status: AnalysisStatus;
    clipUrl: string | null;
    startTime: number | null;
    endTime: number | null;
    bridgeSentence: string | null;
    whySelected: string | null;
    hookScore: number | null;
    transcriptSource: TranscriptSource | null;
    fullHooks: object[] | null;
    videoDurationSeconds: number | null;
    creditsUsed: number;
    errorMessage: string | null;
    createdAt: Date;
    user: UserEntity;
    userId: string;
}
