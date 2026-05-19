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
const user_entity_1 = require("../users/entities/user.entity");
const platform_service_1 = require("./platform.service");
const video_downloader_service_1 = require("./video-downloader.service");
const ffmpeg_service_1 = require("./ffmpeg.service");
const cloudinary_service_1 = require("./cloudinary.service");
const transcript_service_1 = require("./transcript.service");
const hook_scoring_service_1 = require("./hook-scoring.service");
const YOUTUBE_ID_RE = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const COST_URL_ANALYZE = 1;
const COST_UPLOAD_ANALYZE = 3;
const COST_REBUILD = 3;
const COST_CLIP = 1;
let AnalyzeService = AnalyzeService_1 = class AnalyzeService {
    constructor(analyses, users, credits, config, platform, downloader, ffmpeg, cloudinary, transcript, hookScoring) {
        this.analyses = analyses;
        this.users = users;
        this.credits = credits;
        this.config = config;
        this.platform = platform;
        this.downloader = downloader;
        this.ffmpeg = ffmpeg;
        this.cloudinary = cloudinary;
        this.transcript = transcript;
        this.hookScoring = hookScoring;
        this.logger = new common_1.Logger(AnalyzeService_1.name);
        this.minDuration = config.get('DEFAULT_HOOK_MIN_DURATION', 9);
        this.maxDuration = config.get('DEFAULT_HOOK_MAX_DURATION', 20);
    }
    detectPlatform(url) {
        if (!url?.trim())
            return { platform: 'unknown', supported: false };
        const info = this.platform.detect(url);
        return {
            platform: info.platform,
            supported: info.supported,
            videoId: info.videoId,
        };
    }
    async analyzeUrl(userId, userEmail, dto) {
        const { video_url } = dto;
        const detected = this.platform.detect(video_url);
        if (!detected.supported) {
            throw new common_1.BadRequestException('Unsupported platform. Use YouTube, Google Drive, Rumble, TikTok, or Instagram.');
        }
        this.logger.log(`Step 0: Request received | user=${userEmail} | platform=${detected.platform} | url=${video_url}`);
        const creditsRemaining = await this.credits.spendCredits(userId, COST_URL_ANALYZE, `Video analysis: ${video_url}`);
        this.logger.log(`Step 1: Credit deducted | user=${userEmail} | spent=${COST_URL_ANALYZE} | remaining=${creditsRemaining}`);
        const record = await this.analyses.save(this.analyses.create({
            userId,
            sourceUrl: video_url,
            platform: detected.platform,
            status: 'processing',
            creditsUsed: COST_URL_ANALYZE,
        }));
        this.logger.log(`Step 1: Analysis record created | id=${record.id}`);
        let videoPath = null;
        let hookPath = null;
        let mergedPath = null;
        try {
            this.logger.log(`Step 2: Fetching transcript | platform=${detected.platform}`);
            const videoId = video_url.match(YOUTUBE_ID_RE)?.[1];
            let transcriptResult = videoId
                ? await this.transcript.fromYoutube(videoId)
                : null;
            const transcriptSource = transcriptResult?.source ?? 'whisper';
            if (!transcriptResult) {
                this.logger.log(`Step 2: No captions found — downloading for Whisper`);
                videoPath = await this.downloader.download(video_url);
                transcriptResult = await this.transcript.fromWhisper(videoPath);
            }
            const { segments, source } = transcriptResult;
            if (!segments?.length) {
                throw new common_1.InternalServerErrorException('No transcript text could be extracted from this video.');
            }
            this.logger.log(`Step 2: Transcript ready | source=${source} | segments=${segments.length}`);
            const minDur = dto.min_hook_duration ?? this.minDuration;
            const maxDur = dto.max_hook_duration ?? this.maxDuration;
            this.logger.log(`Step 3: Scoring hook candidates via Claude | duration=${minDur}–${maxDur}s`);
            const { hooks, caption } = await this.hookScoring.selectTopHooks(segments, minDur, maxDur, source);
            if (!hooks?.length) {
                throw new common_1.InternalServerErrorException('Claude could not identify any hook candidates in this video.');
            }
            const best = hooks[0];
            this.logger.log(`Step 3: Hooks scored | best score=${best.hookScore} (${best.hookScoreLabel}) | ${best.startTime}s→${best.endTime}s`);
            if (!videoPath) {
                this.logger.log(`Step 4: Downloading video for clip extraction`);
                videoPath = await this.downloader.download(video_url);
                this.logger.log(`Step 4: Download complete`);
            }
            else {
                this.logger.log(`Step 4: Video already downloaded`);
            }
            this.logger.log(`Step 5: Extracting clips for all ${hooks.length} hooks`);
            const hooksWithClips = await Promise.allSettled(hooks.map(async (hook, i) => {
                this.logger.log(`Step 5.${i + 1}: Extracting clip for hook rank=${hook.rank} | ${hook.startTime}s→${hook.endTime}s`);
                let hookClipPath = null;
                let mergedClipPath = null;
                try {
                    hookClipPath = await this.ffmpeg.extractClip(videoPath, hook.startTime, hook.endTime);
                    mergedClipPath = await this.ffmpeg.mergeWithCrossfade(hookClipPath, videoPath);
                    const clipUrl = await this.cloudinary.uploadVideo(mergedClipPath, `hook-${record.id}-rank${hook.rank}`);
                    this.logger.log(`Step 5.${i + 1}: ✓ Hook rank=${hook.rank} uploaded | url=${clipUrl}`);
                    return { ...hook, clip: { url: clipUrl } };
                }
                catch (err) {
                    this.logger.warn(`Step 5.${i + 1}: ✗ Hook rank=${hook.rank} clip failed | error=${err instanceof Error ? err.message : String(err)}`);
                    return { ...hook, clip: null };
                }
                finally {
                    const toClean = [hookClipPath, mergedClipPath].filter(Boolean);
                    if (toClean.length)
                        this.ffmpeg.cleanup(...toClean);
                }
            }));
            const processedHooks = hooksWithClips.map((result, i) => result.status === 'fulfilled' ? result.value : { ...hooks[i], clip: null });
            const bestHookWithClip = processedHooks[0];
            const bestClipUrl = bestHookWithClip.clip?.url ?? null;
            if (!bestClipUrl) {
                throw new common_1.InternalServerErrorException('Failed to generate clip for the best hook. Please try again.');
            }
            this.logger.log(`Step 5: All clips processed | ${processedHooks.filter((h) => h.clip).length}/${hooks.length} succeeded`);
            const videoTitle = await this.platform.fetchVideoTitle(video_url, detected.platform);
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl: bestClipUrl,
                startTime: bestHookWithClip.startTime,
                endTime: bestHookWithClip.endTime,
                bridgeSentence: bestHookWithClip.bridgeSentence,
                whySelected: bestHookWithClip.whySelected,
                hookScore: bestHookWithClip.hookScore,
                transcriptSource: source,
                fullHooks: processedHooks,
                videoTitle: videoTitle ?? 'Untitled',
            });
            this.logger.log(`✅ Done | user=${userEmail} | id=${record.id} | score=${bestHookWithClip.hookScore} | clip=${bestClipUrl}`);
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`✗ Failed | user=${userEmail} | id=${record.id} | error=${message}`);
            await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
            await this.refundCredit(userId, userEmail, COST_URL_ANALYZE, record.id);
            throw err;
        }
        finally {
            const toClean = [videoPath, hookPath, mergedPath].filter(Boolean);
            if (toClean.length) {
                this.ffmpeg.cleanup(...toClean);
                this.logger.log(`Cleanup: removed ${toClean.length} temp file(s)`);
            }
        }
    }
    async analyzeUpload(userId, userEmail, file, body) {
        if (!file)
            throw new common_1.BadRequestException('No video file provided');
        this.logger.log(`Step 0: Upload received | user=${userEmail} | file=${file.originalname} | size=${(file.size / 1024 / 1024).toFixed(1)}MB`);
        const creditsRemaining = await this.credits.spendCredits(userId, COST_UPLOAD_ANALYZE, `Video upload analysis: ${file.originalname}`);
        this.logger.log(`Step 1: Credits deducted | user=${userEmail} | spent=${COST_UPLOAD_ANALYZE} | remaining=${creditsRemaining}`);
        const record = await this.analyses.save(this.analyses.create({
            userId,
            platform: 'upload',
            status: 'processing',
            creditsUsed: COST_UPLOAD_ANALYZE,
            videoTitle: file.originalname,
        }));
        this.logger.log(`Step 1: Analysis record created | id=${record.id}`);
        let hookPath = null;
        let mergedPath = null;
        try {
            this.logger.log(`Step 2: Transcribing audio via Whisper | path=${file.path}`);
            const { segments, source } = await this.transcript.fromWhisper(file.path);
            if (!segments?.length) {
                throw new common_1.InternalServerErrorException('No speech detected in this video.');
            }
            this.logger.log(`Step 2: Transcript ready | segments=${segments.length}`);
            const minDur = body.min_hook_duration ? parseInt(body.min_hook_duration, 10) : this.minDuration;
            const maxDur = body.max_hook_duration ? parseInt(body.max_hook_duration, 10) : this.maxDuration;
            this.logger.log(`Step 3: Scoring hook candidates via Claude | duration=${minDur}–${maxDur}s`);
            const { hooks } = await this.hookScoring.selectTopHooks(segments, minDur, maxDur, source);
            if (!hooks?.length) {
                throw new common_1.InternalServerErrorException('Claude could not identify any hook candidates.');
            }
            const best = hooks[0];
            this.logger.log(`Step 3: Hooks scored | best score=${best.hookScore} | ${best.startTime}s→${best.endTime}s`);
            this.logger.log(`Step 4: Extracting hook clip`);
            hookPath = await this.ffmpeg.extractClip(file.path, best.startTime, best.endTime);
            this.logger.log(`Step 4: Clip extracted`);
            this.logger.log(`Step 5: Creating crossfade merge`);
            mergedPath = await this.ffmpeg.mergeWithCrossfade(hookPath, file.path);
            this.logger.log(`Step 5: Crossfade complete`);
            this.logger.log(`Step 6: Uploading to Cloudinary`);
            const clipUrl = await this.cloudinary.uploadVideo(mergedPath);
            this.logger.log(`Step 6: Uploaded | url=${clipUrl}`);
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl,
                startTime: best.startTime,
                endTime: best.endTime,
                bridgeSentence: best.bridgeSentence,
                whySelected: best.whySelected,
                hookScore: best.hookScore,
                transcriptSource: source,
                fullHooks: hooks,
                videoTitle: file.originalname,
            });
            this.logger.log(`✅ Done | user=${userEmail} | id=${record.id} | clip=${clipUrl}`);
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`✗ Failed | user=${userEmail} | id=${record.id} | error=${message}`);
            await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
            await this.refundCredit(userId, userEmail, COST_UPLOAD_ANALYZE, record.id);
            throw err;
        }
        finally {
            const toClean = [hookPath, mergedPath, file.path].filter(Boolean);
            if (toClean.length) {
                this.ffmpeg.cleanup(...toClean);
                this.logger.log(`Cleanup: removed ${toClean.length} temp file(s)`);
            }
        }
    }
    async rebuild(userId, userEmail, dto) {
        this.logger.log(`Step 0: Rebuild request | user=${userEmail} | analysisId=${dto.analysisId} | hookRank=${dto.hookRank ?? 1}`);
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
        this.logger.log(`Step 1: Hook selected | rank=${hookRank} | score=${chosenHook.hookScore} | ${chosenHook.startTime}s→${chosenHook.endTime}s`);
        const creditsRemaining = await this.credits.spendCredits(userId, COST_REBUILD, `Rebuild hook rank ${hookRank} from analysis ${dto.analysisId}`);
        this.logger.log(`Step 2: Credits deducted | user=${userEmail} | spent=${COST_REBUILD} | remaining=${creditsRemaining}`);
        const record = await this.analyses.save(this.analyses.create({
            userId,
            sourceUrl: original.sourceUrl,
            platform: original.platform,
            status: 'processing',
            creditsUsed: COST_REBUILD,
            videoTitle: original.videoTitle,
        }));
        let videoPath = null;
        let hookPath = null;
        let mergedPath = null;
        try {
            this.logger.log(`Step 3: Downloading video for rebuild`);
            videoPath = await this.downloader.download(original.sourceUrl);
            this.logger.log(`Step 4: Extracting clip | ${chosenHook.startTime}s→${chosenHook.endTime}s`);
            hookPath = await this.ffmpeg.extractClip(videoPath, chosenHook.startTime, chosenHook.endTime);
            this.logger.log(`Step 5: Creating crossfade merge`);
            mergedPath = await this.ffmpeg.mergeWithCrossfade(hookPath, videoPath);
            this.logger.log(`Step 6: Uploading to Cloudinary`);
            const clipUrl = await this.cloudinary.uploadVideo(mergedPath);
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl,
                startTime: chosenHook.startTime,
                endTime: chosenHook.endTime,
                bridgeSentence: chosenHook.bridgeSentence,
                whySelected: chosenHook.whySelected,
                hookScore: chosenHook.hookScore,
                transcriptSource: original.transcriptSource,
                fullHooks: original.fullHooks,
            });
            this.logger.log(`✅ Rebuild done | user=${userEmail} | id=${record.id} | clip=${clipUrl}`);
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`✗ Rebuild failed | user=${userEmail} | id=${record.id} | error=${message}`);
            await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
            await this.refundCredit(userId, userEmail, COST_REBUILD, record.id);
            throw err;
        }
        finally {
            const toClean = [videoPath, hookPath, mergedPath].filter(Boolean);
            if (toClean.length)
                this.ffmpeg.cleanup(...toClean);
        }
    }
    async extractClip(userId, userEmail, dto) {
        this.logger.log(`Step 0: Clip extract | user=${userEmail} | analysisId=${dto.analysisId} | ${dto.startTime}s→${dto.endTime}s`);
        const original = await this.findOwnedAnalysis(userId, dto.analysisId);
        const duration = dto.endTime - dto.startTime;
        if (duration < 1 || duration > 120) {
            throw new common_1.BadRequestException('Clip duration must be between 1 and 120 seconds');
        }
        const creditsRemaining = await this.credits.spendCredits(userId, COST_CLIP, `Extract clip [${dto.startTime}s → ${dto.endTime}s] from ${dto.analysisId}`);
        const record = await this.analyses.save(this.analyses.create({
            userId,
            sourceUrl: original.sourceUrl,
            platform: original.platform,
            status: 'processing',
            creditsUsed: COST_CLIP,
            videoTitle: original.videoTitle,
        }));
        let videoPath = null;
        let clipPath = null;
        try {
            this.logger.log(`Step 1: Downloading video`);
            videoPath = await this.downloader.download(original.sourceUrl);
            this.logger.log(`Step 2: Extracting clip | ${dto.startTime}s → ${dto.endTime}s (${duration.toFixed(1)}s)`);
            clipPath = await this.ffmpeg.extractClip(videoPath, dto.startTime, dto.endTime);
            this.logger.log(`Step 3: Uploading to Cloudinary`);
            const clipUrl = await this.cloudinary.uploadVideo(clipPath);
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl,
                startTime: dto.startTime,
                endTime: dto.endTime,
            });
            this.logger.log(`✅ Clip extracted | user=${userEmail} | id=${record.id} | url=${clipUrl}`);
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`✗ Clip extract failed | user=${userEmail} | id=${record.id} | error=${message}`);
            await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
            await this.refundCredit(userId, userEmail, COST_CLIP, record.id);
            throw err;
        }
        finally {
            const toClean = [videoPath, clipPath].filter(Boolean);
            if (toClean.length)
                this.ffmpeg.cleanup(...toClean);
        }
    }
    async hookOnly(userId, userEmail, dto) {
        const { video_url } = dto;
        const detected = this.platform.detect(video_url);
        if (!detected.supported) {
            throw new common_1.BadRequestException('Unsupported platform.');
        }
        this.logger.log(`Step 0: Hook-only request | user=${userEmail} | platform=${detected.platform} | url=${video_url}`);
        const creditsRemaining = await this.credits.spendCredits(userId, COST_URL_ANALYZE, `Hook-only analysis: ${video_url}`);
        this.logger.log(`Step 1: Credit deducted | user=${userEmail} | spent=${COST_URL_ANALYZE} | remaining=${creditsRemaining}`);
        const record = await this.analyses.save(this.analyses.create({
            userId,
            sourceUrl: video_url,
            platform: detected.platform,
            status: 'processing',
            creditsUsed: COST_URL_ANALYZE,
        }));
        let videoPath = null;
        let hookPath = null;
        let hookOnlyPath = null;
        try {
            this.logger.log(`Step 2: Fetching transcript`);
            const videoId = video_url.match(YOUTUBE_ID_RE)?.[1];
            let transcriptResult = videoId
                ? await this.transcript.fromYoutube(videoId)
                : null;
            if (!transcriptResult) {
                this.logger.log(`Step 2: Falling back to Whisper`);
                videoPath = await this.downloader.download(video_url);
                transcriptResult = await this.transcript.fromWhisper(videoPath);
            }
            const { segments, source } = transcriptResult;
            if (!segments?.length) {
                throw new common_1.InternalServerErrorException('No transcript found in this video.');
            }
            this.logger.log(`Step 2: Transcript ready | source=${source} | segments=${segments.length}`);
            const minDur = dto.min_hook_duration ?? this.minDuration;
            const maxDur = dto.max_hook_duration ?? this.maxDuration;
            this.logger.log(`Step 3: Scoring hooks via Claude | duration=${minDur}–${maxDur}s`);
            const { hooks } = await this.hookScoring.selectTopHooks(segments, minDur, maxDur, source);
            if (!hooks?.length) {
                throw new common_1.InternalServerErrorException('Claude could not identify any hooks.');
            }
            const best = hooks[0];
            this.logger.log(`Step 3: Best hook | score=${best.hookScore} (${best.hookScoreLabel}) | ${best.startTime}s→${best.endTime}s`);
            if (!videoPath) {
                this.logger.log(`Step 4: Downloading video`);
                videoPath = await this.downloader.download(video_url);
                this.logger.log(`Step 4: Download complete`);
            }
            else {
                this.logger.log(`Step 4: Video already downloaded`);
            }
            this.logger.log(`Step 5: Extracting hook-only clips for all ${hooks.length} hooks`);
            const hooksWithClips = await Promise.allSettled(hooks.map(async (hook, i) => {
                this.logger.log(`Step 5.${i + 1}: Extracting hook-only clip | rank=${hook.rank} | ${hook.startTime}s→${hook.endTime}s`);
                let rawHookPath = null;
                let processedPath = null;
                try {
                    rawHookPath = await this.ffmpeg.extractClip(videoPath, hook.startTime, hook.endTime);
                    processedPath = await this.ffmpeg.extractHookOnly(rawHookPath);
                    const clipUrl = await this.cloudinary.uploadVideo(processedPath, `hook-only-${record.id}-rank${hook.rank}`);
                    this.logger.log(`Step 5.${i + 1}: ✓ rank=${hook.rank} uploaded | url=${clipUrl}`);
                    return { ...hook, clip: { url: clipUrl } };
                }
                catch (err) {
                    this.logger.warn(`Step 5.${i + 1}: ✗ rank=${hook.rank} failed | error=${err instanceof Error ? err.message : String(err)}`);
                    return { ...hook, clip: null };
                }
                finally {
                    const toClean = [rawHookPath, processedPath].filter(Boolean);
                    if (toClean.length)
                        this.ffmpeg.cleanup(...toClean);
                }
            }));
            const processedHooks = hooksWithClips.map((result, i) => result.status === 'fulfilled' ? result.value : { ...hooks[i], clip: null });
            const bestHook = processedHooks[0];
            const bestClipUrl = bestHook.clip?.url ?? null;
            if (!bestClipUrl) {
                throw new common_1.InternalServerErrorException('Failed to generate hook clip. Please try again.');
            }
            const videoTitle = await this.platform.fetchVideoTitle(video_url, detected.platform);
            await this.analyses.update(record.id, {
                status: 'complete',
                clipUrl: bestClipUrl,
                startTime: bestHook.startTime,
                endTime: bestHook.endTime,
                bridgeSentence: bestHook.bridgeSentence,
                whySelected: bestHook.whySelected,
                hookScore: bestHook.hookScore,
                transcriptSource: source,
                fullHooks: processedHooks,
                videoTitle: videoTitle ?? 'Untitled',
            });
            this.logger.log(`✅ Hook-only done | user=${userEmail} | id=${record.id} | score=${bestHook.hookScore} | clip=${bestClipUrl}`);
            const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
            return this.toResponse(updated, creditsRemaining);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`✗ Hook-only failed | user=${userEmail} | id=${record.id} | error=${message}`);
            await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
            await this.refundCredit(userId, userEmail, COST_URL_ANALYZE, record.id);
            throw err;
        }
        finally {
            const toClean = [videoPath, hookPath, hookOnlyPath].filter(Boolean);
            if (toClean.length) {
                this.ffmpeg.cleanup(...toClean);
                this.logger.log(`Cleanup: removed ${toClean.length} temp file(s)`);
            }
        }
    }
    async findOwnedAnalysis(userId, id) {
        const record = await this.analyses.findOne({ where: { id, userId } });
        if (!record)
            throw new common_1.NotFoundException(`Analysis ${id} not found`);
        return record;
    }
    async refundCredit(userId, userEmail, amount, analysisId) {
        try {
            await this.users.increment({ id: userId }, 'credits', amount);
            this.logger.log(`Credit refunded | user=${userEmail} | amount=${amount} | analysisId=${analysisId}`);
        }
        catch (err) {
            this.logger.error(`Failed to refund credit | user=${userEmail} | error=${String(err)}`);
        }
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
};
exports.AnalyzeService = AnalyzeService;
exports.AnalyzeService = AnalyzeService = AnalyzeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(analysis_entity_1.AnalysisEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        credits_service_1.CreditsService,
        config_1.ConfigService,
        platform_service_1.PlatformService,
        video_downloader_service_1.VideoDownloaderService,
        ffmpeg_service_1.FfmpegService,
        cloudinary_service_1.CloudinaryService,
        transcript_service_1.TranscriptService,
        hook_scoring_service_1.HookScoringService])
], AnalyzeService);
//# sourceMappingURL=analyze.service.js.map