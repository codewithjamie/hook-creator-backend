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
const prompt_service_1 = require("./prompt.service");
let ClaudeService = ClaudeService_1 = class ClaudeService {
    constructor(config, promptService) {
        this.config = config;
        this.promptService = promptService;
        this.logger = new common_1.Logger(ClaudeService_1.name);
        this.client = new sdk_1.default({
            apiKey: config.getOrThrow('ANTHROPIC_API_KEY'),
        });
    }
    async selectHooks(transcript, minDuration, maxDuration, maxRetries = 2) {
        const userPrompt = this.promptService.buildHookPrompt(transcript, minDuration, maxDuration);
        this.logger.log(`Sending ${transcript.length} segments to Claude for hook selection`);
        let lastError;
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
                    throw new common_1.InternalServerErrorException('Claude returned no text content.');
                }
                const rawText = textContent.text.trim();
                this.logger.debug(`Claude raw response length: ${rawText.length} chars`);
                return this.parseHookResponse(rawText);
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                const isRetryable = err instanceof sdk_1.default.RateLimitError ||
                    err instanceof sdk_1.default.InternalServerError;
                if (isRetryable && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    this.logger.warn(`Claude API error (attempt ${attempt + 1}/${maxRetries + 1}), ` +
                        `retrying in ${delay}ms: ${lastError.message}`);
                    await this.sleep(delay);
                }
                else {
                    break;
                }
            }
        }
        throw new common_1.BadGatewayException(`Claude API failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
    }
    parseHookResponse(raw) {
        const cleaned = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        }
        catch {
            this.logger.error(`Failed to parse Claude JSON: ${cleaned.slice(0, 200)}`);
            throw new common_1.InternalServerErrorException('Claude returned malformed JSON. This is a transient error — please retry.');
        }
        if (!Array.isArray(parsed.hooks) || parsed.hooks.length === 0) {
            throw new common_1.InternalServerErrorException('Claude returned no hooks in its response.');
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
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.ClaudeService = ClaudeService;
exports.ClaudeService = ClaudeService = ClaudeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prompt_service_1.PromptService])
], ClaudeService);
//# sourceMappingURL=claude.service.js.map