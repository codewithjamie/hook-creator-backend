import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { TranscriptSegment } from './transcript.service';

export interface ParsedHook {
  rank: number;
  startTime: number;
  endTime: number;
  startSentence: string;
  endSentence: string;
  bridgeSentence: string;
  whySelected: string;
  hookScore: number;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.getOrThrow<string>('ANTHROPIC_API_KEY') });
  }

  async selectHooks(
    segments: TranscriptSegment[],
    minDuration: number,
    maxDuration: number,
  ): Promise<ParsedHook[]> {
    const transcript = segments.map((s) => `[${s.start.toFixed(2)}] ${s.text}`).join('\n');

    const prompt = `You are an expert video editor specializing in viral short-form content.

Analyze this transcript and identify the 6 best hook segments that will immediately capture attention.

TRANSCRIPT:
${transcript}

RULES:
- Each hook MUST be between ${minDuration} and ${maxDuration} seconds
- startTime and endTime MUST be exact [timestamp] values from the transcript
- Hooks must NOT overlap
- Return ONLY valid JSON

SCORING (0-100):
- Pattern interruption: 0-25pts
- Curiosity/information gap: 0-25pts  
- Specificity/credibility: 0-20pts
- Emotional hook: 0-20pts
- Duration optimality: 0-10pts

Return ONLY this JSON structure, no markdown:
{
  "hooks": [
    {
      "rank": 1,
      "startTime": <exact timestamp>,
      "endTime": <exact timestamp>,
      "startSentence": "<first sentence verbatim>",
      "endSentence": "<last sentence verbatim>",
      "bridgeSentence": "<max 15 word teaser>",
      "whySelected": "<2-3 sentences using rubric>",
      "hookScore": <0-100 integer>
    }
  ]
}`;

    this.logger.log(`Sending ${segments.length} segments to Claude`);

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: 'You are a video content analyst. Return only valid parseable JSON.',
          messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content.find((c) => c.type === 'text');
        if (!text || text.type !== 'text') throw new Error('No text response from Claude');

        const cleaned = text.text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned) as { hooks: ParsedHook[] };

        if (!parsed.hooks?.length) throw new Error('Claude returned no hooks');

        this.logger.log(`Claude returned ${parsed.hooks.length} hooks`);
        return parsed.hooks;
      } catch (err) {
        if (attempt === 2) throw new InternalServerErrorException(`Claude failed: ${String(err)}`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    throw new InternalServerErrorException('Claude failed after retries');
  }
}