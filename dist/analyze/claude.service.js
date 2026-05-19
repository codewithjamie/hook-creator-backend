"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ClaudeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = require("@anthropic-ai/sdk");
let ClaudeService = ClaudeService_1 = class ClaudeService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(ClaudeService_1.name);
        this.client = new sdk_1.default({ apiKey: config.getOrThrow('ANTHROPIC_API_KEY') });
    }
    async selectHooks(segments, minDuration, maxDuration) {
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
                if (!text || text.type !== 'text')
                    throw new Error('No text response from Claude');
                const cleaned = text.text.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(cleaned);
                if (!parsed.hooks?.length)
                    throw new Error('Claude returned no hooks');
                this.logger.log(`Claude returned ${parsed.hooks.length} hooks`);
                return parsed.hooks;
            }
            catch (err) {
                if (attempt === 2)
                    throw new common_1.InternalServerErrorException(`Claude failed: ${String(err)}`);
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
        throw new common_1.InternalServerErrorException('Claude failed after retries');
    }
};
exports.ClaudeService = ClaudeService;
exports.ClaudeService = ClaudeService = ClaudeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClaudeService);
//# sourceMappingURL=claude.service.js.map