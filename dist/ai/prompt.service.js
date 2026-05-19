"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptService = void 0;
const common_1 = require("@nestjs/common");
let PromptService = class PromptService {
    buildHookPrompt(transcript, minDuration, maxDuration) {
        const formattedTranscript = transcript
            .map((s) => `[${s.start.toFixed(2)}] ${s.text}`)
            .join('\n');
        return `You are an expert video editor and content strategist specializing in viral short-form content. Your task is to analyze a video transcript and identify the 6 best "hook" segments — moments that will immediately capture attention and compel viewers to watch the full video.

## TRANSCRIPT
The transcript is formatted as: [timestamp_in_seconds] sentence_text

${formattedTranscript}

## HOOK REQUIREMENTS

### Duration Rules (STRICT)
- Each hook MUST be between ${minDuration} and ${maxDuration} seconds long
- Duration = endTime - startTime
- startTime MUST be the timestamp of a sentence that begins naturally
- endTime MUST be the timestamp of a sentence that ends naturally (i.e., the start of the NEXT sentence after the last included sentence)

### Boundary Rules (CRITICAL — DO NOT VIOLATE)
- startTime must exactly match a [timestamp] value from the transcript
- endTime must exactly match a [timestamp] value from the transcript (the timestamp AFTER your last chosen sentence)
- Hooks must NOT start mid-sentence or end mid-sentence
- Hooks must NOT overlap with each other

### Content Quality Criteria
Hooks should exhibit as many of these as possible:
1. **Pattern Interruption** — Starts with something unexpected, provocative, or counterintuitive
2. **Story Loop Opening** — Creates an open question or mystery that demands resolution
3. **Social Proof or Stakes** — References compelling results, transformations, or consequences
4. **Visceral Specificity** — Uses concrete numbers, names, or specific details (not vague)
5. **Emotional Resonance** — Triggers curiosity, fear of missing out, surprise, or validation
6. **Natural Energy** — The speaker's voice/delivery conveys conviction or urgency

## SCORING RUBRIC (0–100)
Weight each dimension and sum:
- Pattern interruption power: 0–25 points
- Information gap / curiosity loop: 0–25 points
- Specificity and credibility: 0–20 points
- Emotional hook strength: 0–20 points
- Duration optimality (closer to ${Math.round((minDuration + maxDuration) / 2)}s is better): 0–10 points

## BRIDGE SENTENCE
Each hook needs a "bridge sentence" — a SHORT, punchy teaser line (max 15 words) that appears as a caption or spoken transition, making viewers want to see what comes next. It should:
- Tease without revealing
- Create urgency or curiosity
- Feel natural, not clickbait
- Reference something specific from the hook content

## OUTPUT FORMAT
Return ONLY valid JSON — no markdown, no preamble, no explanation outside the JSON.

{
  "hooks": [
    {
      "rank": 1,
      "startTime": <number — exact [timestamp] from transcript>,
      "endTime": <number — exact [timestamp] of sentence AFTER last included sentence>,
      "startSentence": "<first sentence of hook — verbatim from transcript>",
      "endSentence": "<last sentence of hook — verbatim from transcript>",
      "bridgeSentence": "<15 words max teaser>",
      "whySelected": "<2–3 sentences explaining hook quality using rubric criteria>",
      "hookScore": <integer 0–100>
    },
    ... (exactly 6 hooks, ranked 1=best to 6=sixth best)
  ]
}

## CRITICAL REMINDERS
- Return EXACTLY 6 hooks
- Hooks must NOT overlap in time
- startTime and endTime must be exact [timestamp] values from the transcript
- hookScore must be an integer
- bridgeSentence must be 15 words or fewer
- The JSON must be parseable — no trailing commas, no comments`;
    }
    get hookSystemPrompt() {
        return `You are an expert video content analyst and editor with deep expertise in viral social media content, audience psychology, and video storytelling. You analyze transcripts with surgical precision and always return valid, parseable JSON exactly as specified. You never add commentary outside the JSON structure.`;
    }
};
exports.PromptService = PromptService;
exports.PromptService = PromptService = __decorate([
    (0, common_1.Injectable)()
], PromptService);
//# sourceMappingURL=prompt.service.js.map