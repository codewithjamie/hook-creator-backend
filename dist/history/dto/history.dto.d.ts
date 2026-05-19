export declare class HistoryItemResponse {
    id: string;
    sourceUrl: string | null;
    videoTitle: string | null;
    clipUrl: string | null;
    hookScore: number | null;
    startTime: number | null;
    endTime: number | null;
    bridgeSentence: string | null;
    platform: string;
    status: string;
    creditsUsed: number;
    createdAt: Date;
}
export declare class HistoryListResponse {
    items: HistoryItemResponse[];
    total: number;
    page: number;
    limit: number;
}
