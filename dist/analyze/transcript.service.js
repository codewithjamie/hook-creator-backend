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
var TranscriptService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
const fs = require("fs");
const ffmpeg_service_1 = require("./ffmpeg.service");
let TranscriptService = TranscriptService_1 = class TranscriptService {
    constructor(config, ffmpeg) {
        this.config = config;
        this.ffmpeg = ffmpeg;
        this.logger = new common_1.Logger(TranscriptService_1.name);
        this.openai = new openai_1.default({ apiKey: config.getOrThrow('OPENAI_API_KEY') });
    }
    async fromYoutube(videoId) {
        try {
            const { YoutubeTranscript } = require('youtube-transcript');
            let captions = null;
            for (const lang of ['en', 'en-US', 'en-GB']) {
                try {
                    const result = await YoutubeTranscript.fetchTranscript(videoId, { lang });
                    if (result?.length) {
                        captions = result;
                        break;
                    }
                }
                catch {
                }
            }
            if (!captions?.length) {
                captions = await YoutubeTranscript.fetchTranscript(videoId);
            }
            if (!captions?.length)
                return null;
            const segments = this.mergeCaptions(captions);
            this.logger.log(`YouTube captions: ${segments.length} segments`);
            return { segments, source: 'youtube_captions' };
        }
        catch (err) {
            this.logger.warn(`YouTube captions failed: ${String(err)}`);
            return null;
        }
    }
    async fromWhisper(videoPath) {
        this.logger.log(`Whisper transcription: ${videoPath}`);
        const audioPath = await this.ffmpeg.extractAudioMp3(videoPath);
        try {
            const stat = fs.statSync(audioPath);
            this.logger.log(`Audio extracted: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);
            const response = await this.openai.audio.transcriptions.create({
                model: 'whisper-1',
                file: fs.createReadStream(audioPath),
                response_format: 'verbose_json',
                timestamp_granularities: ['segment'],
            });
            const segments = this.mergeWhisperSegments(response.segments ?? []);
            this.logger.log(`Whisper: ${segments.length} segments`);
            return { segments, source: 'whisper' };
        }
        finally {
            this.ffmpeg.cleanup(audioPath);
        }
    }
    mergeCaptions(captions) {
        const result = [];
        let current = '';
        let start = null;
        const SENTENCE_END = /[.!?]\s*$/;
        for (const c of captions) {
            const text = c.text.replace(/\[.*?\]/g, '').trim();
            if (!text)
                continue;
            if (start === null)
                start = c.offset / 1000;
            current += (current ? ' ' : '') + text;
            if (SENTENCE_END.test(current)) {
                result.push({ start: start, text: current.trim() });
                current = '';
                start = null;
            }
        }
        if (current.trim() && start !== null) {
            result.push({ start, text: current.trim() });
        }
        return result;
    }
    mergeWhisperSegments(segs) {
        return this.mergeCaptions(segs.map((s) => ({
            text: s.text,
            offset: s.start * 1000,
            duration: (s.end - s.start) * 1000,
        })));
    }
};
exports.TranscriptService = TranscriptService;
exports.TranscriptService = TranscriptService = TranscriptService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        ffmpeg_service_1.FfmpegService])
], TranscriptService);
//# sourceMappingURL=transcript.service.js.map