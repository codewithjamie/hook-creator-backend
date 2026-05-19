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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AnalyzeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const analysis_entity_1 = require("./entities/analysis.entity");
const credits_service_1 = require("../credits/credits.service");
const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/;
const RUMBLE_RE = /rumble\.com/;
const GDRIVE_RE = /drive\.google\.com/;
const YOUTUBE_ID_RE = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const COST_URL_ANALYZE = 1;
const COST_UPLOAD_ANALYZE = 3;
const COST_REBUILD = 3;
const COST_CLIP = 1;
let AnalyzeService = AnalyzeService_1 = class AnalyzeService {
    constructor(analyses, credits, config) {
        this.analyses = analyses;
        this.credits = credits;
        this.config = config;
        this.logger = new common_1.Logger(AnalyzeService_1.name);
        this.minDuration = config.get('DEFAULT_HOOK_MIN_DURATION', 6);
        this.maxDuration = config.get('DEFAULT_HOOK_MAX_DURATION', 12);
    }
    detectPlatform(url) {
        if (!url?.trim())
            return { platform: 'unknown', supported: false };
        if (YOUTUBE_RE.test(url)) {
            return {
                platform: 'youtube',
                supported: true,
                videoId: url.match(YOUTUBE_ID_RE)?.[1],
            };
        }
        if (RUMBLE_RE.test(url))
            return { platform: 'rumble', supported: true };
        if (GDRIVE_RE.test(url))
            return { platform: 'google_drive', supported: true };
        return { platform: 'generic', supported: true };
    }
    async analyzeUrl(userId, dto) {
        const detected = this.detectPlatform(dto.video_url);
        const platform = detected.platform;
        const record = await this.analyses.save(this.analyses.create({
            userId,
            sourceUrl: dto.video_url,
            platform,
            status: 'pending',
            creditsUsed: COST_URL_ANALYZE,
        }));
        const creditsRemaining = await this.credits.spendCredits(userId, COST_URL_ANALYZE, `Video analysis: ${dto.video_url}`, record.id);
        await this.analyses.update(record.id, { status: 'processing' });
        try {
            const result = await this.runPipeline(dto);
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl: result.clipUrl,
                startTime: result.startTime,
                endTime: result.endTime,
                bridgeSentence: result.bridgeSentence,
                whySelected: result.whySelected,
                hookScore: result.hookScore,
                transcriptSource: result.transcriptSource,
                fullHooks: result.fullHooks,
                videoTitle: result.videoTitle,
                videoDurationSeconds: result.videoDurationSeconds,
            });
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            await this.analyses.update(record.id, {
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }
    async analyzeUpload(userId, file, body) {
        if (!file)
            throw new common_1.BadRequestException('No video file provided');
        const record = await this.analyses.save(this.analyses.create({
            userId,
            platform: 'upload',
            status: 'pending',
            creditsUsed: COST_UPLOAD_ANALYZE,
            videoTitle: file.originalname,
        }));
        const creditsRemaining = await this.credits.spendCredits(userId, COST_UPLOAD_ANALYZE, `Video upload analysis: ${file.originalname}`, record.id);
        await this.analyses.update(record.id, { status: 'processing' });
        try {
            const result = await this.runPipeline({ video_url: file.path });
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl: result.clipUrl,
                startTime: result.startTime,
                endTime: result.endTime,
                bridgeSentence: result.bridgeSentence,
                whySelected: result.whySelected,
                hookScore: result.hookScore,
                transcriptSource: result.transcriptSource,
                fullHooks: result.fullHooks,
                videoTitle: file.originalname,
            });
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            await this.analyses.update(record.id, {
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }
    async rebuild(userId, dto) {
        const original = await this.findOwnedAnalysis(userId, dto.analysisId);
        if (!original.fullHooks?.length) {
            throw new common_1.BadRequestException('Original analysis has no hooks to rebuild from');
        }
        const hookRank = dto.hookRank ?? 1;
        const hooks = original.fullHooks;
        const chosenHook = hooks.find((h) => h.rank === hookRank);
        if (!chosenHook) {
            throw new common_1.BadRequestException(`Hook rank ${hookRank} not found in original analysis`);
        }
        const record = await this.analyses.save(this.analyses.create({
            userId,
            sourceUrl: original.sourceUrl,
            platform: original.platform,
            status: 'pending',
            creditsUsed: COST_REBUILD,
            videoTitle: original.videoTitle,
        }));
        const creditsRemaining = await this.credits.spendCredits(userId, COST_REBUILD, `Rebuild hook rank ${hookRank} from analysis ${dto.analysisId}`, record.id);
        await this.analyses.update(record.id, { status: 'processing' });
        try {
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl: original.clipUrl,
                startTime: chosenHook.startTime,
                endTime: chosenHook.endTime,
                bridgeSentence: chosenHook.bridgeSentence,
                whySelected: chosenHook.whySelected,
                hookScore: chosenHook.hookScore,
                transcriptSource: original.transcriptSource,
                fullHooks: original.fullHooks,
            });
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            await this.analyses.update(record.id, {
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }
    async extractClip(userId, dto) {
        const original = await this.findOwnedAnalysis(userId, dto.analysisId);
        const duration = dto.endTime - dto.startTime;
        if (duration < 1 || duration > 120) {
            throw new common_1.BadRequestException('Clip duration must be between 1 and 120 seconds');
        }
        const record = await this.analyses.save(this.analyses.create({
            userId,
            sourceUrl: original.sourceUrl,
            platform: original.platform,
            status: 'pending',
            creditsUsed: COST_CLIP,
            videoTitle: original.videoTitle,
        }));
        const creditsRemaining = await this.credits.spendCredits(userId, COST_CLIP, `Extract clip [${dto.startTime}s → ${dto.endTime}s] from ${dto.analysisId}`, record.id);
        await this.analyses.update(record.id, { status: 'processing' });
        try {
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl: original.clipUrl,
                startTime: dto.startTime,
                endTime: dto.endTime,
            });
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            await this.analyses.update(record.id, {
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }
    async findOwnedAnalysis(userId, id) {
        const record = await this.analyses.findOne({ where: { id, userId } });
        if (!record)
            throw new common_1.NotFoundException(`Analysis ${id} not found`);
        return record;
    }
    toResponse(record, creditsRemaining) {
        return {
            id: record.id,
            status: record.status,
            clipUrl: record.clipUrl,
            startTime: record.startTime,
            endTime: record.endTime,
            bridgeSentence: record.bridgeSentence,
            whySelected: record.whySelected,
            hookScore: record.hookScore,
            transcriptSource: record.transcriptSource,
            fullHooks: record.fullHooks,
            creditsUsed: record.creditsUsed,
            creditsRemaining,
            videoTitle: record.videoTitle,
            videoDurationSeconds: record.videoDurationSeconds,
            platform: record.platform,
            sourceUrl: record.sourceUrl,
            errorMessage: record.errorMessage,
            createdAt: record.createdAt,
        };
    }
    async runPipeline(dto) {
        this.logger.warn('runPipeline() is a stub — wire your real pipeline services here');
        return {
            clipUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
            startTime: 42.5,
            endTime: 51.2,
            bridgeSentence: 'What happens next will change how you think about this.',
            whySelected: 'Opens with a counterintuitive claim that creates immediate curiosity.',
            hookScore: 87,
            transcriptSource: 'youtube_captions',
            fullHooks: [],
            videoTitle: 'Sample Video',
            videoDurationSeconds: 300,
        };
    }
};
exports.AnalyzeService = AnalyzeService;
exports.AnalyzeService = AnalyzeService = AnalyzeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(analysis_entity_1.AnalysisEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        credits_service_1.CreditsService,
        config_1.ConfigService])
], AnalyzeService);
//# sourceMappingURL=analyze.service%20copy.js.map