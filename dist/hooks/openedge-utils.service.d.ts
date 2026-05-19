import type { TranscriptSegment } from '../common/dto/analyze.dto';
export declare class OpenEdgeUtilsService {
    private readonly logger;
    mergeWhisperToSentences(whisperSegments: Array<{
        start: number;
        end: number;
        text: string;
    }>): TranscriptSegment[];
    mergeYoutubeCaptions(captions: Array<{
        text: string;
        offset: number;
        duration: number;
    }>): TranscriptSegment[];
    validateTranscriptQuality(segments: TranscriptSegment[]): {
        isValid: boolean;
        reason?: string;
    };
    formatForClaude(segments: TranscriptSegment[]): string;
    private cleanText;
}
