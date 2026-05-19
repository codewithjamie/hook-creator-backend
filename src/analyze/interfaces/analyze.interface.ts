export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface ClipInfo {
  publicId: string;       // e.g. "openedge/hooks/user-uuid/hook-p1-1-abc12345"
  watchUrl: string;       // HTTPS streaming URL — paste into <video src>
  downloadUrl: string;    // fl_attachment URL — forces browser download
  duration: number;       // clip duration in seconds
  format: string;         // always "mp4"
  sizeBytes: number;      // file size in bytes
}

export interface HookCandidate {
  rank: number;
  hookScore: number;
  hookScoreLabel: string;   // computed in TypeScript via scoreToLabel(), never by LLM
  hookScoreSummary: string; // kept for backward compat — mirrors hookSummary
  hookSummary: string;      // new field: "<Label>: one sentence on why this works"
  sceneTitle: string;       // short topic title shown on the hook card (e.g. "Foreign Control of US Leaders")
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

  // Video title fetched from yt-dlp — shown in history
  videoTitle: string | null;

  // Top-level = best hook (rank 1)
  hookScore: number;
  hookScoreLabel: string;
  hookScoreSummary: string;
  hookSummary: string;
  startTime: number;
  endTime: number;
  duration: number;
  bridgeSentence: string;
  whySelected: string;

  // Best hook clip
  clip: ClipInfo | null;

  // All 6 ranked hooks
  allHooks: HookCandidate[];

  caption: string;
  transcript: string;
  transcriptSource: 'youtube_captions' | 'whisper' | 'yt_dlp';
}