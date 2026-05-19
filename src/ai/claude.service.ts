import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PromptService } from './prompt.service';
import type { TranscriptSegment, ParsedHook } from '../common/dto/analyze.dto';

interface ClaudeHookResponse {
  hooks: Array<{
    rank: number;
    startTime: number;
    endTime: number;
    startSentence: string;
    endSentence: string;
    bridgeSentence: string;
    whySelected: string;
    hookScore: number;
  }>;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly promptService: PromptService,
  ) {
    this.client = new Anthropic({
      apiKey: config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Send transcript to Claude and get back 6 ranked hooks.
   * Includes retry logic for transient API failures.
   */
  async selectHooks(
    transcript: TranscriptSegment[],
    minDuration: number,
    maxDuration: number,
    maxRetries = 2,
  ): Promise<ParsedHook[]> {
    const userPrompt = this.promptService.buildHookPrompt(
      transcript,
      minDuration,
      maxDuration,
    );

    this.logger.log(
      `Sending ${transcript.length} segments to Claude for hook selection`,
    );

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: this.promptService.hookSystemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new InternalServerErrorException(
            'Claude returned no text content.',
          );
        }

        const rawText = textContent.text.trim();
        this.logger.debug(`Claude raw response length: ${rawText.length} chars`);

        return this.parseHookResponse(rawText);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const isRetryable =
          err instanceof Anthropic.RateLimitError ||
          err instanceof Anthropic.InternalServerError;

        if (isRetryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(
            `Claude API error (attempt ${attempt + 1}/${maxRetries + 1}), ` +
              `retrying in ${delay}ms: ${lastError.message}`,
          );
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    throw new BadGatewayException(
      `Claude API failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Private Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private parseHookResponse(raw: string): ParsedHook[] {
    // Strip possible markdown code fences
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: ClaudeHookResponse;
    try {
      parsed = JSON.parse(cleaned) as ClaudeHookResponse;
    } catch {
      this.logger.error(`Failed to parse Claude JSON: ${cleaned.slice(0, 200)}`);
      throw new InternalServerErrorException(
        'Claude returned malformed JSON. This is a transient error — please retry.',
      );
    }

    if (!Array.isArray(parsed.hooks) || parsed.hooks.length === 0) {
      throw new InternalServerErrorException(
        'Claude returned no hooks in its response.',
      );
    }

    return parsed.hooks.map((h) => ({
      rank: h.rank,
      startTime: Number(h.startTime),
      endTime: Number(h.endTime),
      startSentence: h.startSentence ?? '',
      endSentence: h.endSentence ?? '',
      bridgeSentence: h.bridgeSentence ?? '',
      whySelected: h.whySelected ?? '',
      hookScore: Number(h.hookScore),
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
