"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OpenEdgeUtilsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenEdgeUtilsService = void 0;
const common_1 = require("@nestjs/common");
let OpenEdgeUtilsService = OpenEdgeUtilsService_1 = class OpenEdgeUtilsService {
    constructor() {
        this.logger = new common_1.Logger(OpenEdgeUtilsService_1.name);
    }
    mergeWhisperToSentences(whisperSegments) {
        const result = [];
        let currentText = '';
        let currentStart = null;
        const SENTENCE_ENDINGS = /[.!?]+\s*$/;
        for (const seg of whisperSegments) {
            const text = seg.text.trim();
            if (!text)
                continue;
            if (currentStart === null) {
                currentStart = seg.start;
            }
            currentText += (currentText ? ' ' : '') + text;
            if (SENTENCE_ENDINGS.test(currentText)) {
                result.push({
                    start: currentStart,
                    text: this.cleanText(currentText),
                });
                currentText = '';
                currentStart = null;
            }
        }
        if (currentText.trim() && currentStart !== null) {
            result.push({
                start: currentStart,
                text: this.cleanText(currentText),
            });
        }
        this.logger.debug(`Whisper merge: ${whisperSegments.length} raw segments → ${result.length} sentences`);
        return result;
    }
    mergeYoutubeCaptions(captions) {
        const whisperLike = captions.map((c) => ({
            start: c.offset / 1000,
            end: (c.offset + c.duration) / 1000,
            text: c.text,
        }));
        return this.mergeWhisperToSentences(whisperLike);
    }
    validateTranscriptQuality(segments) {
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
        const garbledPattern = /♪|♫|\[Music\]|\[Applause\]|\[Laughter\]/gi;
        const garbledCount = (totalText.match(garbledPattern) ?? []).length;
        const garbledRatio = garbledCount / segments.length;
        if (garbledRatio > 0.5) {
            return {
                isValid: false,
                reason: `High garbled content ratio (${(garbledRatio * 100).toFixed(0)}%). Likely music/background video.`,
            };
        }
        const punctuatedSegments = segments.filter((s) => /[.!?,]/.test(s.text));
        const punctuationRatio = punctuatedSegments.length / segments.length;
        if (punctuationRatio < 0.1 && segments.length > 10) {
            this.logger.warn(`Low punctuation ratio (${(punctuationRatio * 100).toFixed(0)}%) — ` +
                `transcript may be auto-generated without punctuation.`);
        }
        return { isValid: true };
    }
    formatForClaude(segments) {
        return segments
            .map((s) => `[${s.start.toFixed(2)}] ${s.text}`)
            .join('\n');
    }
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\[.*?\]/g, '')
            .trim();
    }
};
exports.OpenEdgeUtilsService = OpenEdgeUtilsService;
exports.OpenEdgeUtilsService = OpenEdgeUtilsService = OpenEdgeUtilsService_1 = __decorate([
    (0, common_1.Injectable)()
], OpenEdgeUtilsService);
//# sourceMappingURL=openedge-utils.service.js.map