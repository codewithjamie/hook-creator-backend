import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
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
  clip: { url: string } | null; 
}

export interface ClaudeHooksResult {
  hooks: HookCandidate[];
  caption: string;
}

function scoreToLabel(score: number): string {
  if (score >= 90) return 'Exceptional open';
  if (score >= 75) return 'Strong open';
  if (score >= 60) return 'Solid open';
  if (score >= 40) return 'Average open';
  return 'Weak open';
}

function mergeSegmentsToLines(segments: TranscriptSegment[]): string {
  if (!segments.length) return '';

  const SENTENCE_END = /[.!?]["']?\s*$/;
  const MAX_WORDS_BEFORE_FLUSH = 20;

  const lines: string[] = [];
  let sentenceStart: number | null = null;
  const parts: string[] = [];

  const flush = () => {
    if (!parts.length || sentenceStart === null) return;
    const joined = parts.join(' ').trim();
    if (joined.split(/\s+/).length >= 4) {
      lines.push(`[${sentenceStart.toFixed(1)}] ${joined}`);
    }
    sentenceStart = null;
    parts.length = 0;
  };

  for (const seg of segments) {
    const text = (seg.text ?? '').trim();
    if (!text) continue;
    if (sentenceStart === null) sentenceStart = seg.start;
    parts.push(text);
    const joined = parts.join(' ');
    const wordCount = joined.split(/\s+/).length;
    if (SENTENCE_END.test(joined)) {
      flush();
    } else if (wordCount >= MAX_WORDS_BEFORE_FLUSH) {
      flush();
    }
  }

  flush();
  return lines.join('\n');
}

function formatSegmentsDirect(segments: TranscriptSegment[]): string {
  return segments
    .filter((s) => s.text?.trim())
    .map((s) => `[${s.start.toFixed(1)}] ${s.text.trim()}`)
    .join('\n');
}

interface RawHook {
  rank: number;
  startTime: number;
  endTime: number;
  hookScore: number;
  sceneTitle: string;
  hookSummary: string;
  bridgeSentence: string;
  whySelected: string;
}

function validateAndClampHooks(
  hooks: RawHook[],
  minDuration: number,
  maxDuration: number,
): { valid: RawHook[]; warnings: string[] } {
  const warnings: string[] = [];

  const valid = hooks
    .filter((h) => {
      if (h.startTime == null || h.endTime == null) {
        warnings.push(`Hook rank ${h.rank}: missing timing — skipped`);
        return false;
      }
      if (h.startTime >= h.endTime) {
        warnings.push(`Hook rank ${h.rank}: startTime >= endTime — skipped`);
        return false;
      }
      return true;
    })
    .map((h) => {
      const dur = h.endTime - h.startTime;
      if (dur < minDuration) {
        warnings.push(`Hook rank ${h.rank}: ${dur.toFixed(1)}s < ${minDuration}s — clamped`);
        h.endTime = h.startTime + minDuration;
      } else if (dur > maxDuration) {
        warnings.push(`Hook rank ${h.rank}: ${dur.toFixed(1)}s > ${maxDuration}s — clamped`);
        h.endTime = h.startTime + maxDuration;
      }
      h.hookScore = Math.min(100, Math.max(0, h.hookScore));
      return h;
    });

  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i], b = valid[j];
      if (!(a.endTime <= b.startTime || b.endTime <= a.startTime)) {
        warnings.push(
          `Hook rank ${a.rank} (${a.startTime}–${a.endTime}s) overlaps with rank ${b.rank} (${b.startTime}–${b.endTime}s)`,
        );
      }
    }
  }

  return { valid, warnings };
}

const SENTENCE_END_REGEX = /[.!?]["']?\s*$/;
const SNAP_LOOKAHEAD_SECONDS = 4;

function snapEndToSentenceBoundary(
  rawSegments: TranscriptSegment[],
  endTime: number,
  maxAllowedEnd: number,
): number {
  const candidates = rawSegments.filter(
    (s) => s.start >= endTime - 1.5 && s.start <= endTime + SNAP_LOOKAHEAD_SECONDS,
  );

  for (const seg of candidates) {
    const segEnd = seg.start + (seg.duration ?? 2);
    if (SENTENCE_END_REGEX.test(seg.text.trim())) {
      if (segEnd <= maxAllowedEnd) {
        return +segEnd.toFixed(2);
      }
    }
  }

  return endTime;
}

@Injectable()
export class HookScoringService {
  private readonly logger = new Logger(HookScoringService.name);
  private _anthropic: Anthropic | null = null;

  private get anthropic(): Anthropic {
    if (!this._anthropic) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new InternalServerErrorException('ANTHROPIC_API_KEY is not set.');
      }
      this._anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this._anthropic;
  }

  async selectTopHooks(
    segments: TranscriptSegment[],
    minDuration = 12,
    maxDuration = 30,
    transcriptSource: 'youtube_captions' | 'whisper' = 'youtube_captions',
  ): Promise<ClaudeHooksResult> {
    let processedSegments = segments;

    if (transcriptSource === 'youtube_captions') {
      this.logger.log('Punctuation pre-call: YouTube captions — running Haiku');
      processedSegments = await this.punctuateTranscript(segments);
    } else {
      this.logger.log(`Punctuation pre-call: skipped (source: ${transcriptSource})`);
    }

    const transcriptText = transcriptSource === 'youtube_captions'
      ? mergeSegmentsToLines(processedSegments)
      : formatSegmentsDirect(processedSegments);

    this.logger.log(
      `Hook scoring | ${segments.length} raw → ${processedSegments.length} processed → ${transcriptText.split('\n').length} lines | duration: ${minDuration}–${maxDuration}s`,
    );

    const hooks = await this.callHookPrompt(transcriptText, minDuration, maxDuration, processedSegments);

    if (!hooks.length) {
      throw new InternalServerErrorException('Claude returned no valid hook candidates.');
    }

    const topHook = hooks[0];
    const topHookLabel = scoreToLabel(topHook.hookScore);
    const hookText = this.extractHookText(transcriptText, topHook.startTime, topHook.endTime);

    const caption = await this.callCaptionPrompt(
      hookText,
      topHook.bridgeSentence,
      topHook.hookScore,
      topHookLabel,
    );

    return { hooks, caption };
  }

  private async punctuateTranscript(segments: TranscriptSegment[]): Promise<TranscriptSegment[]> {
    const rawLines = segments
      .map((s) => `[${s.start.toFixed(1)}] ${s.text.trim()}`)
      .join('\n');

    const prompt = `You are a transcript editor. Add punctuation (periods, question marks, commas) to the transcript below.

RULES:
- Do NOT change any words
- Do NOT add new words or remove words
- Do NOT reorder lines
- Preserve ALL [timestamp] markers exactly as they appear
- Only add: periods (.), commas (,), question marks (?), exclamation marks (!)
- Return ONLY the corrected transcript lines, nothing else

TRANSCRIPT:
${rawLines}`;

    try {
      const msg = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: Math.min(4096, rawLines.length * 2),
        messages: [{ role: 'user', content: prompt }],
      });

      const result = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

      if (!result) {
        this.logger.warn('Punctuation pre-call returned empty — using original segments');
        return segments;
      }

      const lines = result.split('\n').filter((l) => l.trim());
      const reparsed: TranscriptSegment[] = [];

      for (const line of lines) {
        const match = line.match(/^\[(\d+\.?\d*)\]\s+(.+)$/);
        if (match) {
          const start = parseFloat(match[1]);
          const text = match[2].trim();
          const orig = segments.find((s) => Math.abs(s.start - start) < 0.2);
          reparsed.push({ start, text, duration: orig?.duration ?? 2 });
        }
      }

      if (reparsed.length < segments.length * 0.7) {
        this.logger.warn(
          `Punctuation pre-call parse mismatch (${reparsed.length} vs ${segments.length}) — using originals`,
        );
        return segments;
      }

      this.logger.log(`Punctuation pre-call done | ${segments.length} → ${reparsed.length} segments`);
      return reparsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Punctuation pre-call failed: ${msg} — using original segments`);
      return segments;
    }
  }

  private async callHookPrompt(
    transcriptText: string,
    minDuration: number,
    maxDuration: number,
    rawSegments: TranscriptSegment[],
  ): Promise<HookCandidate[]> {
    const prompt = `You are an expert video hook analyst specializing in identifying the single best cold open moment in a video.

TRANSCRIPT (format: [start_seconds] text):
${transcriptText}

TASK: Identify the TOP 6 best hook segments, ranked 1 (best) to 6 (least best).

DURATION TARGET: ${minDuration}–${maxDuration} seconds

HARD CONSTRAINTS:
- Duration MUST be ${minDuration}–${maxDuration} seconds (endTime - startTime)
- startTime MUST be the exact timestamp of the FIRST word of a COMPLETE sentence
- endTime MUST be the exact timestamp after the LAST word of a COMPLETE sentence
- NEVER cut mid-sentence
- NEVER start with greetings ("Hey guys", "Welcome back")
- NEVER spoil the full answer or conclusion
- Each hook must be non-overlapping
- Must be fully self-contained

SCORING RUBRIC (total: 100 pts):
- Pattern interrupt or open loop strength: 30 pts
- Specificity (numbers, names, outcomes): 25 pts
- Stakes or urgency: 20 pts
- Emotional or curiosity trigger: 15 pts
- Language strength: 10 pts

Return ONLY valid JSON — no markdown, no backticks:
{
  "hooks": [
    {
      "rank": 1,
      "startTime": <number>,
      "endTime": <number>,
      "hookScore": <integer 0-100>,
      "sceneTitle": "<4-6 word topic title>",
      "hookSummary": "<score label: one sentence why this works>",
      "bridgeSentence": "<max 15 word teaser>",
      "whySelected": "<2-3 sentences on what makes this powerful>"
    }
  ]
}`;

    const msg = await this.anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return this.parseHooks(raw, minDuration, maxDuration, rawSegments);
  }

  private async callCaptionPrompt(
    hookText: string,
    bridgeSentence: string,
    hookScore: number,
    hookScoreLabel: string,
  ): Promise<string> {
    const prompt = `You are a social media copywriter specializing in short-form video content.

HOOK CLIP CONTEXT:
- Hook text: ${hookText}
- Bridge sentence: ${bridgeSentence}
- Hook score: ${hookScore} — ${hookScoreLabel}

Write one punchy caption for this hook clip.

RULES:
- 3-5 lines total
- First line is the strongest hook statement
- Lines 2-3 build intrigue or state the stakes
- Final line is a micro-CTA or tension statement
- End with 3-5 relevant hashtags
- No emojis unless lifestyle content

Return ONLY valid JSON:
{
  "caption": "<caption text with \\n line breaks>"
}`;

    try {
      const msg = await this.anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const p = JSON.parse(clean) as { caption?: string };
      return p.caption ?? '';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Caption generation failed: ${message}`);
      return '';
    }
  }

  private parseHooks(
    raw: string,
    minDuration: number,
    maxDuration: number,
    rawSegments: TranscriptSegment[],
  ): HookCandidate[] {
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed: { hooks?: RawHook[] };
    try {
      parsed = JSON.parse(clean) as { hooks?: RawHook[] };
    } catch {
      this.logger.error(`Failed to parse hook JSON: ${raw.slice(0, 300)}`);
      throw new InternalServerErrorException('Claude returned invalid JSON for hook selection.');
    }

    const rawHooks: RawHook[] = (parsed.hooks ?? []).map((h) => ({
      rank: h.rank,
      startTime: Number(h.startTime),
      endTime: Number(h.endTime),
      hookScore: parseInt(String(h.hookScore), 10),
      sceneTitle: h.sceneTitle ?? '',
      hookSummary: h.hookSummary ?? '',
      bridgeSentence: h.bridgeSentence ?? '',
      whySelected: h.whySelected ?? '',
    }));

    const { valid, warnings } = validateAndClampHooks(rawHooks, minDuration, maxDuration);

    if (warnings.length) {
      this.logger.warn(`Hook validation:\n${warnings.join('\n')}`);
    }

    return valid
      .sort((a, b) => a.rank - b.rank)
      .map((h) => {
        const maxAllowedEnd = h.startTime + maxDuration + SNAP_LOOKAHEAD_SECONDS;
        const snappedEnd = snapEndToSentenceBoundary(rawSegments, h.endTime, maxAllowedEnd);

        if (snappedEnd !== h.endTime) {
          this.logger.log(`Hook rank ${h.rank}: endTime snapped ${h.endTime}s → ${snappedEnd}s`);
          h.endTime = snappedEnd;
        }

        const label = scoreToLabel(h.hookScore);
        return {
          rank: h.rank,
          hookScore: h.hookScore,
          hookScoreLabel: label,
          hookScoreSummary: h.hookSummary,
          hookSummary: h.hookSummary,
          sceneTitle: h.sceneTitle,
          startTime: +h.startTime.toFixed(2),
          endTime: +h.endTime.toFixed(2),
          duration: +(h.endTime - h.startTime).toFixed(2),
          bridgeSentence: h.bridgeSentence,
          whySelected: h.whySelected,
          clip: null,
        };
      });
  }

  private extractHookText(transcriptText: string, startTime: number, endTime: number): string {
    return transcriptText
      .split('\n')
      .filter((line) => {
        const m = line.match(/^\[(\d+\.?\d*)\]/);
        if (!m) return false;
        const t = parseFloat(m[1]);
        return t >= startTime && t <= endTime;
      })
      .map((l) => l.replace(/^\[\d+\.?\d*\]\s*/, ''))
      .join(' ')
      .trim();
  }
}