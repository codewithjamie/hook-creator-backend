import { Injectable, Logger } from '@nestjs/common';
import type { TranscriptSegment } from '../common/dto/analyze.dto';

/**
 * Port of openedge_utils.py
 *
 * Provides:
 *  - merge_whisper_to_sentences: Collapses raw word-level Whisper output
 *    into clean sentence-level [start] text format for Claude.
 *  - merge_youtube_captions: Normalises YouTube transcript chunks.
 *  - validateTranscriptQuality: Heuristic quality check.
 */
@Injectable()
export class OpenEdgeUtilsService {
  private readonly logger = new Logger(OpenEdgeUtilsService.name);

  /**
   * Merge raw Whisper word/segment output into sentence-level segments.
   *
   * Whisper returns overlapping or very short segments. This collapses them:
   *  1. Accumulates words until a sentence-ending punctuation is hit.
   *  2. Assigns the earliest start time in the accumulated group.
   *  3. Returns clean TranscriptSegment[].
   *
   * Port of openedge_utils.py → merge_whisper_to_sentences()
   */
  mergeWhisperToSentences(
    whisperSegments: Array<{ start: number; end: number; text: string }>,
  ): TranscriptSegment[] {
    const result: TranscriptSegment[] = [];
    let currentText = '';
    let currentStart: number | null = null;

    const SENTENCE_ENDINGS = /[.!?]+\s*$/;

    for (const seg of whisperSegments) {
      const text = seg.text.trim();
      if (!text) continue;

      if (currentStart === null) {
        currentStart = seg.start;
      }

      currentText += (currentText ? ' ' : '') + text;

      // Flush on sentence boundary
      if (SENTENCE_ENDINGS.test(currentText)) {
        result.push({
          start: currentStart,
          text: this.cleanText(currentText),
        });
        currentText = '';
        currentStart = null;
      }
    }

    // Flush any remaining text (last sentence may not have terminal punctuation)
    if (currentText.trim() && currentStart !== null) {
      result.push({
        start: currentStart,
        text: this.cleanText(currentText),
      });
    }

    this.logger.debug(
      `Whisper merge: ${whisperSegments.length} raw segments → ${result.length} sentences`,
    );

    return result;
  }

  /**
   * Normalise YouTube transcript chunks into TranscriptSegment[].
   *
   * YouTube captions come as short overlapping phrases. We group them into
   * sentence-like units using the same sentence-boundary approach.
   */
  mergeYoutubeCaptions(
    captions: Array<{ text: string; offset: number; duration: number }>,
  ): TranscriptSegment[] {
    // Convert to Whisper-like format then reuse the same merge logic
    const whisperLike = captions.map((c) => ({
      start: c.offset / 1000, // YouTube returns ms, convert to seconds
      end: (c.offset + c.duration) / 1000,
      text: c.text,
    }));

    return this.mergeWhisperToSentences(whisperLike);
  }

  /**
   * Heuristic quality check for a transcript.
   *
   * Returns true if transcript is likely usable for hook detection.
   * A low-quality transcript (e.g., auto-generated with garbled words) will
   * score false and trigger the Whisper fallback.
   */
  validateTranscriptQuality(segments: TranscriptSegment[]): {
    isValid: boolean;
    reason?: string;
  } {
    if (segments.length === 0) {
      return { isValid: false, reason: 'Empty transcript' };
    }

    const totalText = segments.map((s) => s.text).join(' ');
    const wordCount = totalText.split(/\s+/).filter(Boolean).length;

    if (wordCount < 30) {
      return {
        isValid: false,
        reason: `Too few words (${wordCount} < 30). Video may be non-verbal or have no captions.`,
      };
    }

    // Check for garbled/music notes (YouTube music-only captions)
    const garbledPattern = /♪|♫|\[Music\]|\[Applause\]|\[Laughter\]/gi;
    const garbledCount = (totalText.match(garbledPattern) ?? []).length;
    const garbledRatio = garbledCount / segments.length;

    if (garbledRatio > 0.5) {
      return {
        isValid: false,
        reason: `High garbled content ratio (${(garbledRatio * 100).toFixed(0)}%). Likely music/background video.`,
      };
    }

    // Check sentence coherence — must have some punctuation
    const punctuatedSegments = segments.filter((s) => /[.!?,]/.test(s.text));
    const punctuationRatio = punctuatedSegments.length / segments.length;

    if (punctuationRatio < 0.1 && segments.length > 10) {
      this.logger.warn(
        `Low punctuation ratio (${(punctuationRatio * 100).toFixed(0)}%) — ` +
          `transcript may be auto-generated without punctuation.`,
      );
      // Not a hard fail — Claude can still work with it
    }

    return { isValid: true };
  }

  /**
   * Format TranscriptSegment[] to the [start] text format Claude expects.
   */
  formatForClaude(segments: TranscriptSegment[]): string {
    return segments
      .map((s) => `[${s.start.toFixed(2)}] ${s.text}`)
      .join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Private
  // ─────────────────────────────────────────────────────────────────────────

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\[.*?\]/g, '') // Strip bracket annotations like [Music]
      .trim();
  }
}
