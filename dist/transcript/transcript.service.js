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
const whisper_service_1 = require("./whisper.service");
const openedge_utils_service_1 = require("../hooks/openedge-utils.service");
let TranscriptService = TranscriptService_1 = class TranscriptService {
    constructor(whisper, utils) {
        this.whisper = whisper;
        this.utils = utils;
        this.logger = new common_1.Logger(TranscriptService_1.name);
    }
    async fromYoutube(videoId, videoPath, forceSource) {
        if (forceSource === 'whisper') {
            return this.fromWhisper(videoPath);
        }
        if (forceSource !== 'youtube_captions') {
            try {
                const result = await this.tryYoutubeCaptions(videoId);
                if (result)
                    return result;
            }
            catch (err) {
                this.logger.warn(`YouTube captions failed for ${videoId}: ${String(err)}`);
            }
        }
        if (forceSource === 'youtube_captions') {
            throw new common_1.UnprocessableEntityException(`YouTube captions not available for video ${videoId}. ` +
                `Try with transcript_source=auto to enable Whisper fallback.`);
        }
        this.logger.log(`Falling back to Whisper for YouTube video ${videoId}`);
        return this.fromWhisper(videoPath);
    }
    async fromWhisper(videoPath) {
        this.logger.log(`Transcribing via Whisper: ${videoPath}`);
        const segments = await this.whisper.transcribe(videoPath);
        const quality = this.utils.validateTranscriptQuality(segments);
        if (!quality.isValid) {
            throw new common_1.UnprocessableEntityException(`Whisper transcript quality check failed: ${quality.reason}`);
        }
        this.logger.log(`Whisper transcript: ${segments.length} segments`);
        return { segments, source: 'whisper' };
    }
    async tryYoutubeCaptions(videoId) {
        const { YoutubeTranscript } = require('youtube-transcript');
        const candidateLangs = ['en', 'en-US', 'en-GB'];
        let captions = null;
        for (const lang of candidateLangs) {
            try {
                captions = await YoutubeTranscript.fetchTranscript(videoId, {
                    lang,
                });
                this.logger.log(`YouTube captions fetched (lang=${lang}): ${captions.length} entries`);
                break;
            }
            catch {
            }
        }
        if (!captions) {
            try {
                captions = await YoutubeTranscript.fetchTranscript(videoId);
                this.logger.log(`YouTube auto captions fetched: ${captions.length} entries`);
            }
            catch {
                return null;
            }
        }
        if (!captions || captions.length === 0)
            return null;
        const segments = this.utils.mergeYoutubeCaptions(captions);
        const quality = this.utils.validateTranscriptQuality(segments);
        if (!quality.isValid) {
            this.logger.warn(`YouTube captions quality check failed: ${quality.reason} — will try Whisper`);
            return null;
        }
        return { segments, source: 'youtube_captions' };
    }
};
exports.TranscriptService = TranscriptService;
exports.TranscriptService = TranscriptService = TranscriptService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [whisper_service_1.WhisperService,
        openedge_utils_service_1.OpenEdgeUtilsService])
], TranscriptService);
//# sourceMappingURL=transcript.service.js.map