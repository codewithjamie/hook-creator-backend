// import {
//   Injectable,
//   Logger,
//   BadRequestException,
//   NotFoundException,
//   InternalServerErrorException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { ConfigService } from '@nestjs/config';
// import { AnalysisEntity, AnalysisPlatform } from './entities/analysis.entity';
// import { CreditsService } from '../credits/credits.service';
// import { UserEntity } from '../users/entities/user.entity';
// import { PlatformService } from './platform.service';
// import { VideoDownloaderService } from './video-downloader.service';
// import { FfmpegService } from './ffmpeg.service';
// import { CloudinaryService } from './cloudinary.service';
// import { TranscriptService } from './transcript.service';
// import { HookScoringService, HookCandidate } from './hook-scoring.service';
// import {
//   AnalyzeUrlDto,
//   RebuildDto,
//   ExtractClipDto,
//   DetectPlatformResponse,
//   AnalysisResponse,
//   HookDto,
//   HookOnlyDto,
// } from './dto/analyze.dto';

// const YOUTUBE_ID_RE = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

// const COST_URL_ANALYZE = 1;
// const COST_UPLOAD_ANALYZE = 3;
// const COST_REBUILD = 3;
// const COST_CLIP = 1;

// @Injectable()
// export class AnalyzeService {
//   private readonly logger = new Logger(AnalyzeService.name);
//   private readonly minDuration: number;
//   private readonly maxDuration: number;

//   constructor(
//     @InjectRepository(AnalysisEntity)
//     private readonly analyses: Repository<AnalysisEntity>,
//     @InjectRepository(UserEntity)
//     private readonly users: Repository<UserEntity>,
//     private readonly credits: CreditsService,
//     private readonly config: ConfigService,
//     private readonly platform: PlatformService,
//     private readonly downloader: VideoDownloaderService,
//     private readonly ffmpeg: FfmpegService,
//     private readonly cloudinary: CloudinaryService,
//     private readonly transcript: TranscriptService,
//     private readonly hookScoring: HookScoringService,
//   ) {
//     this.minDuration = config.get<number>('DEFAULT_HOOK_MIN_DURATION', 9);
//     this.maxDuration = config.get<number>('DEFAULT_HOOK_MAX_DURATION', 20);
//   }

//   detectPlatform(url: string): DetectPlatformResponse {
//     if (!url?.trim()) return { platform: 'unknown', supported: false };
//     const info = this.platform.detect(url);
//     return {
//       platform: info.platform,
//       supported: info.supported,
//       videoId: info.videoId,
//     };
//   }

//   async analyzeUrl(
//     userId: string,
//     userEmail: string,
//     dto: AnalyzeUrlDto,
//   ): Promise<AnalysisResponse> {
//     const { video_url } = dto;

//     // ── Step 0: Detect platform ──────────────────────────────────────────────
//     const detected = this.platform.detect(video_url);
//     if (!detected.supported) {
//       throw new BadRequestException(
//         'Unsupported platform. Use YouTube, Google Drive, Rumble, TikTok, or Instagram.',
//       );
//     }
//     this.logger.log(
//       `Step 0: Request received | user=${userEmail} | platform=${detected.platform} | url=${video_url}`,
//     );

//     // ── Step 1: Deduct credit ────────────────────────────────────────────────
//     const creditsRemaining = await this.credits.spendCredits(
//       userId,
//       COST_URL_ANALYZE,
//       `Video analysis: ${video_url}`,
//     );
//     this.logger.log(
//       `Step 1: Credit deducted | user=${userEmail} | spent=${COST_URL_ANALYZE} | remaining=${creditsRemaining}`,
//     );

//     const record = await this.analyses.save(
//       this.analyses.create({
//         userId,
//         sourceUrl: video_url,
//         platform: detected.platform as AnalysisPlatform,
//         status: 'processing',
//         creditsUsed: COST_URL_ANALYZE,
//       }),
//     );
//     this.logger.log(`Step 1: Analysis record created | id=${record.id}`);

//     let videoPath: string | null = null;
//     let hookPath: string | null = null;
//     let mergedPath: string | null = null;

//     try {
//       // ── Step 2: Fetch transcript ───────────────────────────────────────────
//       this.logger.log(`Step 2: Fetching transcript | platform=${detected.platform}`);

//       const videoId = video_url.match(YOUTUBE_ID_RE)?.[1];
//       let transcriptResult = videoId
//         ? await this.transcript.fromYoutube(videoId)
//         : null;

//       const transcriptSource = transcriptResult?.source ?? 'whisper';

//       if (!transcriptResult) {
//         this.logger.log(`Step 2: No captions found — downloading for Whisper`);
//         videoPath = await this.downloader.download(video_url);
//         transcriptResult = await this.transcript.fromWhisper(videoPath);
//       }

//       const { segments, source } = transcriptResult;
//       if (!segments?.length) {
//         throw new InternalServerErrorException(
//           'No transcript text could be extracted from this video.',
//         );
//       }
//       this.logger.log(
//         `Step 2: Transcript ready | source=${source} | segments=${segments.length}`,
//       );

//       // ── Step 3: Score hooks with Claude ───────────────────────────────────
//       const minDur = dto.min_hook_duration ?? this.minDuration;
//       const maxDur = dto.max_hook_duration ?? this.maxDuration;

//       this.logger.log(
//         `Step 3: Scoring hook candidates via Claude | duration=${minDur}–${maxDur}s`,
//       );

//       const { hooks, caption } = await this.hookScoring.selectTopHooks(
//         segments,
//         minDur,
//         maxDur,
//         source,
//       );

//       if (!hooks?.length) {
//         throw new InternalServerErrorException(
//           'Claude could not identify any hook candidates in this video.',
//         );
//       }

//       const best = hooks[0];
//       this.logger.log(
//         `Step 3: Hooks scored | best score=${best.hookScore} (${best.hookScoreLabel}) | ${best.startTime}s→${best.endTime}s`,
//       );

//       // ── Step 4: Download video (if not already downloaded) ─────────────────
//       if (!videoPath) {
//         this.logger.log(`Step 4: Downloading video for clip extraction`);
//         videoPath = await this.downloader.download(video_url);
//         this.logger.log(`Step 4: Download complete`);
//       } else {
//         this.logger.log(`Step 4: Video already downloaded`);
//       }

//       // ── Step 5: Extract hook clip ─────────────────────────────────────────
//       this.logger.log(`Step 5: Extracting clips for all ${hooks.length} hooks`);

//         const hooksWithClips = await Promise.allSettled(
//           hooks.map(async (hook, i) => {
//             this.logger.log(
//               `Step 5.${i + 1}: Extracting clip for hook rank=${hook.rank} | ${hook.startTime}s→${hook.endTime}s`,
//             );
//             let hookClipPath: string | null = null;
//             let mergedClipPath: string | null = null;

//             try {
//               hookClipPath = await this.ffmpeg.extractClip(videoPath!, hook.startTime, hook.endTime);
//               mergedClipPath = await this.ffmpeg.mergeWithCrossfade(hookClipPath, videoPath!);
//               const clipUrl = await this.cloudinary.uploadVideo(
//                 mergedClipPath,
//                 `hook-${record.id}-rank${hook.rank}`,
//               );
//               this.logger.log(`Step 5.${i + 1}: ✓ Hook rank=${hook.rank} uploaded | url=${clipUrl}`);
//               return { ...hook, clip: { url: clipUrl } };
//             } catch (err) {
//               this.logger.warn(
//                 `Step 5.${i + 1}: ✗ Hook rank=${hook.rank} clip failed | error=${err instanceof Error ? err.message : String(err)}`,
//               );
//               return { ...hook, clip: null };
//             } finally {
//               const toClean = [hookClipPath, mergedClipPath].filter(Boolean) as string[];
//               if (toClean.length) this.ffmpeg.cleanup(...toClean);
//             }
//           }),
//         );

//         // Collect results — failed clips get null, don't fail the whole request
//         const processedHooks = hooksWithClips.map((result, i) =>
//           result.status === 'fulfilled' ? result.value : { ...hooks[i], clip: null },
//         );

//         const bestHookWithClip = processedHooks[0];
//         const bestClipUrl = (bestHookWithClip.clip as { url: string } | null)?.url ?? null;

//         if (!bestClipUrl) {
//           throw new InternalServerErrorException(
//             'Failed to generate clip for the best hook. Please try again.',
//           );
//         }

//         this.logger.log(`Step 5: All clips processed | ${processedHooks.filter((h) => h.clip).length}/${hooks.length} succeeded`);

//         // ── Fetch video title ─────────────────────────────────────────────────
//         const videoTitle = await this.platform.fetchVideoTitle(video_url, detected.platform);

//         await this.analyses.update(record.id, {
//           status: 'complete',
//           clipUrl: bestClipUrl,
//           startTime: bestHookWithClip.startTime,
//           endTime: bestHookWithClip.endTime,
//           bridgeSentence: bestHookWithClip.bridgeSentence,
//           whySelected: bestHookWithClip.whySelected,
//           hookScore: bestHookWithClip.hookScore,
//           transcriptSource: source,
//           fullHooks: processedHooks,
//           videoTitle: videoTitle ?? 'Untitled',
//         });

//         this.logger.log(
//           `✅ Done | user=${userEmail} | id=${record.id} | score=${bestHookWithClip.hookScore} | clip=${bestClipUrl}`,
//         );

//       const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
//       return this.toResponse(updated, creditsRemaining);
//     } catch (err) {
//       const message = err instanceof Error ? err.message : String(err);
//       this.logger.error(
//         `✗ Failed | user=${userEmail} | id=${record.id} | error=${message}`,
//       );
//       await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
//       await this.refundCredit(userId, userEmail, COST_URL_ANALYZE, record.id);
//       throw err;
//     } finally {
//       // ── Cleanup temp files ─────────────────────────────────────────────────
//       const toClean = [videoPath, hookPath, mergedPath].filter(Boolean) as string[];
//       if (toClean.length) {
//         this.ffmpeg.cleanup(...toClean);
//         this.logger.log(`Cleanup: removed ${toClean.length} temp file(s)`);
//       }
//     }
//   }

//   async analyzeUpload(
//     userId: string,
//     userEmail: string,
//     file: Express.Multer.File,
//     body: Record<string, string>,
//   ): Promise<AnalysisResponse> {
//     if (!file) throw new BadRequestException('No video file provided');

//     this.logger.log(
//       `Step 0: Upload received | user=${userEmail} | file=${file.originalname} | size=${(file.size / 1024 / 1024).toFixed(1)}MB`,
//     );

//     const creditsRemaining = await this.credits.spendCredits(
//       userId,
//       COST_UPLOAD_ANALYZE,
//       `Video upload analysis: ${file.originalname}`,
//     );
//     this.logger.log(
//       `Step 1: Credits deducted | user=${userEmail} | spent=${COST_UPLOAD_ANALYZE} | remaining=${creditsRemaining}`,
//     );

//     const record = await this.analyses.save(
//       this.analyses.create({
//         userId,
//         platform: 'upload',
//         status: 'processing',
//         creditsUsed: COST_UPLOAD_ANALYZE,
//         videoTitle: file.originalname,
//       }),
//     );
//     this.logger.log(`Step 1: Analysis record created | id=${record.id}`);

//     let hookPath: string | null = null;
//     let mergedPath: string | null = null;

//     try {
//       // ── Step 2: Transcribe via Whisper ─────────────────────────────────────
//       this.logger.log(`Step 2: Transcribing audio via Whisper | path=${file.path}`);
//       const { segments, source } = await this.transcript.fromWhisper(file.path);

//       if (!segments?.length) {
//         throw new InternalServerErrorException('No speech detected in this video.');
//       }
//       this.logger.log(`Step 2: Transcript ready | segments=${segments.length}`);

//       // ── Step 3: Score hooks ────────────────────────────────────────────────
//       const minDur = body.min_hook_duration ? parseInt(body.min_hook_duration, 10) : this.minDuration;
//       const maxDur = body.max_hook_duration ? parseInt(body.max_hook_duration, 10) : this.maxDuration;

//       this.logger.log(
//         `Step 3: Scoring hook candidates via Claude | duration=${minDur}–${maxDur}s`,
//       );

//       const { hooks } = await this.hookScoring.selectTopHooks(segments, minDur, maxDur, source);

//       if (!hooks?.length) {
//         throw new InternalServerErrorException(
//           'Claude could not identify any hook candidates.',
//         );
//       }

//       const best = hooks[0];
//       this.logger.log(
//         `Step 3: Hooks scored | best score=${best.hookScore} | ${best.startTime}s→${best.endTime}s`,
//       );

//       // ── Step 4: Extract hook clip ──────────────────────────────────────────
//       this.logger.log(`Step 4: Extracting hook clip`);
//       hookPath = await this.ffmpeg.extractClip(file.path, best.startTime, best.endTime);
//       this.logger.log(`Step 4: Clip extracted`);

//       // ── Step 5: Crossfade merge ────────────────────────────────────────────
//       this.logger.log(`Step 5: Creating crossfade merge`);
//       mergedPath = await this.ffmpeg.mergeWithCrossfade(hookPath, file.path);
//       this.logger.log(`Step 5: Crossfade complete`);

//       // ── Step 6: Upload to Cloudinary ───────────────────────────────────────
//       this.logger.log(`Step 6: Uploading to Cloudinary`);
//       const clipUrl = await this.cloudinary.uploadVideo(mergedPath);
//       this.logger.log(`Step 6: Uploaded | url=${clipUrl}`);

//       await this.analyses.update(record.id, {
//         status: 'complete',
//         clipUrl,
//         startTime: best.startTime,
//         endTime: best.endTime,
//         bridgeSentence: best.bridgeSentence,
//         whySelected: best.whySelected,
//         hookScore: best.hookScore,
//         transcriptSource: source,
//         fullHooks: hooks,
//         videoTitle: file.originalname,
//       });

//       this.logger.log(`✅ Done | user=${userEmail} | id=${record.id} | clip=${clipUrl}`);

//       const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
//       return this.toResponse(updated, creditsRemaining);
//     } catch (err) {
//       const message = err instanceof Error ? err.message : String(err);
//       this.logger.error(`✗ Failed | user=${userEmail} | id=${record.id} | error=${message}`);
//       await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
//       await this.refundCredit(userId, userEmail, COST_UPLOAD_ANALYZE, record.id);
//       throw err;
//     } finally {
//       const toClean = [hookPath, mergedPath, file.path].filter(Boolean) as string[];
//       if (toClean.length) {
//         this.ffmpeg.cleanup(...toClean);
//         this.logger.log(`Cleanup: removed ${toClean.length} temp file(s)`);
//       }
//     }
//   }

//   async rebuild(
//     userId: string,
//     userEmail: string,
//     dto: RebuildDto,
//   ): Promise<AnalysisResponse> {
//     this.logger.log(
//       `Step 0: Rebuild request | user=${userEmail} | analysisId=${dto.analysisId} | hookRank=${dto.hookRank ?? 1}`,
//     );

//     const original = await this.findOwnedAnalysis(userId, dto.analysisId);

//     if (!original.fullHooks?.length) {
//       throw new BadRequestException('Original analysis has no hooks to rebuild from');
//     }

//     const hookRank = dto.hookRank ?? 1;
//     const hooks = original.fullHooks as HookCandidate[];
//     const chosenHook = hooks.find((h) => h.rank === hookRank);
//     if (!chosenHook) {
//       throw new BadRequestException(`Hook rank ${hookRank} not found in original analysis`);
//     }

//     this.logger.log(
//       `Step 1: Hook selected | rank=${hookRank} | score=${chosenHook.hookScore} | ${chosenHook.startTime}s→${chosenHook.endTime}s`,
//     );

//     const creditsRemaining = await this.credits.spendCredits(
//       userId,
//       COST_REBUILD,
//       `Rebuild hook rank ${hookRank} from analysis ${dto.analysisId}`,
//     );
//     this.logger.log(
//       `Step 2: Credits deducted | user=${userEmail} | spent=${COST_REBUILD} | remaining=${creditsRemaining}`,
//     );

//     const record = await this.analyses.save(
//       this.analyses.create({
//         userId,
//         sourceUrl: original.sourceUrl,
//         platform: original.platform,
//         status: 'processing',
//         creditsUsed: COST_REBUILD,
//         videoTitle: original.videoTitle,
//       }),
//     );

//     let videoPath: string | null = null;
//     let hookPath: string | null = null;
//     let mergedPath: string | null = null;

//     try {
//       this.logger.log(`Step 3: Downloading video for rebuild`);
//       videoPath = await this.downloader.download(original.sourceUrl!);

//       this.logger.log(`Step 4: Extracting clip | ${chosenHook.startTime}s→${chosenHook.endTime}s`);
//       hookPath = await this.ffmpeg.extractClip(videoPath, chosenHook.startTime, chosenHook.endTime);

//       this.logger.log(`Step 5: Creating crossfade merge`);
//       mergedPath = await this.ffmpeg.mergeWithCrossfade(hookPath, videoPath);

//       this.logger.log(`Step 6: Uploading to Cloudinary`);
//       const clipUrl = await this.cloudinary.uploadVideo(mergedPath);

//       await this.analyses.update(record.id, {
//         status: 'complete',
//         clipUrl,
//         startTime: chosenHook.startTime,
//         endTime: chosenHook.endTime,
//         bridgeSentence: chosenHook.bridgeSentence,
//         whySelected: chosenHook.whySelected,
//         hookScore: chosenHook.hookScore,
//         transcriptSource: original.transcriptSource,
//         fullHooks: original.fullHooks,
//       });

//       this.logger.log(`✅ Rebuild done | user=${userEmail} | id=${record.id} | clip=${clipUrl}`);

//       const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
//       return this.toResponse(updated, creditsRemaining);
//     } catch (err) {
//       const message = err instanceof Error ? err.message : String(err);
//       this.logger.error(`✗ Rebuild failed | user=${userEmail} | id=${record.id} | error=${message}`);
//       await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
//       await this.refundCredit(userId, userEmail, COST_REBUILD, record.id);
//       throw err;
//     } finally {
//       const toClean = [videoPath, hookPath, mergedPath].filter(Boolean) as string[];
//       if (toClean.length) this.ffmpeg.cleanup(...toClean);
//     }
//   }

//   async extractClip(
//     userId: string,
//     userEmail: string,
//     dto: ExtractClipDto,
//   ): Promise<AnalysisResponse> {
//     this.logger.log(
//       `Step 0: Clip extract | user=${userEmail} | analysisId=${dto.analysisId} | ${dto.startTime}s→${dto.endTime}s`,
//     );

//     const original = await this.findOwnedAnalysis(userId, dto.analysisId);
//     const duration = dto.endTime - dto.startTime;

//     if (duration < 1 || duration > 120) {
//       throw new BadRequestException('Clip duration must be between 1 and 120 seconds');
//     }

//     const creditsRemaining = await this.credits.spendCredits(
//       userId,
//       COST_CLIP,
//       `Extract clip [${dto.startTime}s → ${dto.endTime}s] from ${dto.analysisId}`,
//     );

//     const record = await this.analyses.save(
//       this.analyses.create({
//         userId,
//         sourceUrl: original.sourceUrl,
//         platform: original.platform,
//         status: 'processing',
//         creditsUsed: COST_CLIP,
//         videoTitle: original.videoTitle,
//       }),
//     );

//     let videoPath: string | null = null;
//     let clipPath: string | null = null;

//     try {
//       this.logger.log(`Step 1: Downloading video`);
//       videoPath = await this.downloader.download(original.sourceUrl!);

//       this.logger.log(`Step 2: Extracting clip | ${dto.startTime}s → ${dto.endTime}s (${duration.toFixed(1)}s)`);
//       clipPath = await this.ffmpeg.extractClip(videoPath, dto.startTime, dto.endTime);

//       this.logger.log(`Step 3: Uploading to Cloudinary`);
//       const clipUrl = await this.cloudinary.uploadVideo(clipPath);

//       await this.analyses.update(record.id, {
//         status: 'complete',
//         clipUrl,
//         startTime: dto.startTime,
//         endTime: dto.endTime,
//       });

//       this.logger.log(`✅ Clip extracted | user=${userEmail} | id=${record.id} | url=${clipUrl}`);

//       const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
//       return this.toResponse(updated, creditsRemaining);
//     } catch (err) {
//       const message = err instanceof Error ? err.message : String(err);
//       this.logger.error(`✗ Clip extract failed | user=${userEmail} | id=${record.id} | error=${message}`);
//       await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
//       await this.refundCredit(userId, userEmail, COST_CLIP, record.id);
//       throw err;
//     } finally {
//       const toClean = [videoPath, clipPath].filter(Boolean) as string[];
//       if (toClean.length) this.ffmpeg.cleanup(...toClean);
//     }
//   }

//   async hookOnly(
//     userId: string,
//     userEmail: string,
//     dto: HookOnlyDto,
//   ): Promise<AnalysisResponse> {
//     const { video_url } = dto;

//     const detected = this.platform.detect(video_url);
//     if (!detected.supported) {
//       throw new BadRequestException('Unsupported platform.');
//     }

//     this.logger.log(
//       `Step 0: Hook-only request | user=${userEmail} | platform=${detected.platform} | url=${video_url}`,
//     );

//     const creditsRemaining = await this.credits.spendCredits(
//       userId,
//       COST_URL_ANALYZE,
//       `Hook-only analysis: ${video_url}`,
//     );
//     this.logger.log(
//       `Step 1: Credit deducted | user=${userEmail} | spent=${COST_URL_ANALYZE} | remaining=${creditsRemaining}`,
//     );

//     const record = await this.analyses.save(
//       this.analyses.create({
//         userId,
//         sourceUrl: video_url,
//         platform: detected.platform as AnalysisPlatform,
//         status: 'processing',
//         creditsUsed: COST_URL_ANALYZE,
//       }),
//     );

//     let videoPath: string | null = null;
//     let hookPath: string | null = null;
//     let hookOnlyPath: string | null = null;

//     try {
//       // ── Step 2: Transcript ───────────────────────────────────────────────────
//       this.logger.log(`Step 2: Fetching transcript`);
//       const videoId = video_url.match(YOUTUBE_ID_RE)?.[1];
//       let transcriptResult = videoId
//         ? await this.transcript.fromYoutube(videoId)
//         : null;

//       if (!transcriptResult) {
//         this.logger.log(`Step 2: Falling back to Whisper`);
//         videoPath = await this.downloader.download(video_url);
//         transcriptResult = await this.transcript.fromWhisper(videoPath);
//       }

//       const { segments, source } = transcriptResult;
//       if (!segments?.length) {
//         throw new InternalServerErrorException('No transcript found in this video.');
//       }
//       this.logger.log(`Step 2: Transcript ready | source=${source} | segments=${segments.length}`);

//       // ── Step 3: Score hooks ──────────────────────────────────────────────────
//       const minDur = dto.min_hook_duration ?? this.minDuration;
//       const maxDur = dto.max_hook_duration ?? this.maxDuration;

//       this.logger.log(`Step 3: Scoring hooks via Claude | duration=${minDur}–${maxDur}s`);
//       const { hooks } = await this.hookScoring.selectTopHooks(segments, minDur, maxDur, source);

//       if (!hooks?.length) {
//         throw new InternalServerErrorException('Claude could not identify any hooks.');
//       }

//       const best = hooks[0];
//       this.logger.log(
//         `Step 3: Best hook | score=${best.hookScore} (${best.hookScoreLabel}) | ${best.startTime}s→${best.endTime}s`,
//       );

//       // ── Step 4: Download video if not already downloaded ────────────────────
//       if (!videoPath) {
//         this.logger.log(`Step 4: Downloading video`);
//         videoPath = await this.downloader.download(video_url);
//         this.logger.log(`Step 4: Download complete`);
//       } else {
//         this.logger.log(`Step 4: Video already downloaded`);
//       }

//       // ── Step 5: Extract hook clips for all hooks ─────────────────────────────
//       this.logger.log(`Step 5: Extracting hook-only clips for all ${hooks.length} hooks`);

//       const hooksWithClips = await Promise.allSettled(
//         hooks.map(async (hook, i) => {
//           this.logger.log(
//             `Step 5.${i + 1}: Extracting hook-only clip | rank=${hook.rank} | ${hook.startTime}s→${hook.endTime}s`,
//           );
//           let rawHookPath: string | null = null;
//           let processedPath: string | null = null;

//           try {
//             rawHookPath = await this.ffmpeg.extractClip(videoPath!, hook.startTime, hook.endTime);
//             processedPath = await this.ffmpeg.extractHookOnly(rawHookPath);
//             const clipUrl = await this.cloudinary.uploadVideo(
//               processedPath,
//               `hook-only-${record.id}-rank${hook.rank}`,
//             );
//             this.logger.log(`Step 5.${i + 1}: ✓ rank=${hook.rank} uploaded | url=${clipUrl}`);
//             return { ...hook, clip: { url: clipUrl } };
//           } catch (err) {
//             this.logger.warn(
//               `Step 5.${i + 1}: ✗ rank=${hook.rank} failed | error=${err instanceof Error ? err.message : String(err)}`,
//             );
//             return { ...hook, clip: null };
//           } finally {
//             const toClean = [rawHookPath, processedPath].filter(Boolean) as string[];
//             if (toClean.length) this.ffmpeg.cleanup(...toClean);
//           }
//         }),
//       );

//       const processedHooks = hooksWithClips.map((result, i) =>
//         result.status === 'fulfilled' ? result.value : { ...hooks[i], clip: null },
//       );

//       const bestHook = processedHooks[0];
//       const bestClipUrl = (bestHook.clip as { url: string } | null)?.url ?? null;

//       if (!bestClipUrl) {
//         throw new InternalServerErrorException('Failed to generate hook clip. Please try again.');
//       }

//       const videoTitle = await this.platform.fetchVideoTitle(video_url, detected.platform);

//       await this.analyses.update(record.id, {
//         status: 'complete',
//         clipUrl: bestClipUrl,
//         startTime: bestHook.startTime,
//         endTime: bestHook.endTime,
//         bridgeSentence: bestHook.bridgeSentence,
//         whySelected: bestHook.whySelected,
//         hookScore: bestHook.hookScore,
//         transcriptSource: source,
//         fullHooks: processedHooks,
//         videoTitle: videoTitle ?? 'Untitled',
//       });

//       this.logger.log(
//         `✅ Hook-only done | user=${userEmail} | id=${record.id} | score=${bestHook.hookScore} | clip=${bestClipUrl}`,
//       );

//       const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
//       return this.toResponse(updated, creditsRemaining);
//     } catch (err) {
//       const message = err instanceof Error ? err.message : String(err);
//       this.logger.error(`✗ Hook-only failed | user=${userEmail} | id=${record.id} | error=${message}`);
//       await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
//       await this.refundCredit(userId, userEmail, COST_URL_ANALYZE, record.id);
//       throw err;
//     } finally {
//       const toClean = [videoPath, hookPath, hookOnlyPath].filter(Boolean) as string[];
//       if (toClean.length) {
//         this.ffmpeg.cleanup(...toClean);
//         this.logger.log(`Cleanup: removed ${toClean.length} temp file(s)`);
//       }
//     }
//   }

//   // ─── Private Helpers ──────────────────────────────────────────────────────

//   private async findOwnedAnalysis(userId: string, id: string): Promise<AnalysisEntity> {
//     const record = await this.analyses.findOne({ where: { id, userId } });
//     if (!record) throw new NotFoundException(`Analysis ${id} not found`);
//     return record;
//   }

//   private async refundCredit(
//     userId: string,
//     userEmail: string,
//     amount: number,
//     analysisId: string,
//   ): Promise<void> {
//     try {
//       await this.users.increment({ id: userId }, 'credits', amount);
//       this.logger.log(
//         `Credit refunded | user=${userEmail} | amount=${amount} | analysisId=${analysisId}`,
//       );
//     } catch (err) {
//       this.logger.error(
//         `Failed to refund credit | user=${userEmail} | error=${String(err)}`,
//       );
//     }
//   }

//   private toResponse(record: AnalysisEntity, creditsRemaining: number): AnalysisResponse {
//     return {
//       id: record.id,
//       status: record.status,
//       clipUrl: record.clipUrl,
//       startTime: record.startTime,
//       endTime: record.endTime,
//       bridgeSentence: record.bridgeSentence,
//       whySelected: record.whySelected,
//       hookScore: record.hookScore,
//       transcriptSource: record.transcriptSource,
//       fullHooks: record.fullHooks as HookDto[] | null,
//       creditsUsed: record.creditsUsed,
//       creditsRemaining,
//       videoTitle: record.videoTitle,
//       videoDurationSeconds: record.videoDurationSeconds,
//       platform: record.platform,
//       sourceUrl: record.sourceUrl,
//       errorMessage: record.errorMessage,
//       createdAt: record.createdAt,
//     };
//   }
// }
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AnalysisEntity, AnalysisPlatform } from './entities/analysis.entity';
import { CreditsService } from '../credits/credits.service';
import { UserEntity } from '../users/entities/user.entity';
import { PlatformService } from './platform.service';
import { VideoDownloaderService } from './video-downloader.service';
import { FfmpegService } from './ffmpeg.service';
import { CloudinaryService } from './cloudinary.service';
import { TranscriptService } from './transcript.service';
import { HookScoringService, HookCandidate } from './hook-scoring.service';
import {
  AnalyzeUrlDto,
  RebuildDto,
  ExtractClipDto,
  DetectPlatformResponse,
  AnalysisResponse,
  HookDto,
  HookOnlyDto,
} from './dto/analyze.dto';

const YOUTUBE_ID_RE = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const COST_URL_ANALYZE = 1;
const COST_UPLOAD_ANALYZE = 3;
const COST_REBUILD = 3;
const COST_CLIP = 1;
const MAX_HOOKS_ANALYZE = 1;   // /analyze — best hook only
const MAX_HOOKS_HOOK_ONLY = 6; // /hook-only — 6 hooks

// Video duration credit tiers (in seconds)
const DURATION_TIERS = [
  { minSeconds: 50 * 60, extraCredits: 4 },  // > 50 mins
  { minSeconds: 20 * 60, extraCredits: 2 },  // > 20 mins
  { minSeconds: 10 * 60, extraCredits: 1 },  // > 10 mins
];

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  private readonly minDuration: number;
  private readonly maxDuration: number;

  constructor(
    @InjectRepository(AnalysisEntity)
    private readonly analyses: Repository<AnalysisEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly credits: CreditsService,
    private readonly config: ConfigService,
    private readonly platform: PlatformService,
    private readonly downloader: VideoDownloaderService,
    private readonly ffmpeg: FfmpegService,
    private readonly cloudinary: CloudinaryService,
    private readonly transcript: TranscriptService,
    private readonly hookScoring: HookScoringService,
  ) {
    this.minDuration = config.get<number>('DEFAULT_HOOK_MIN_DURATION', 9);
    this.maxDuration = config.get<number>('DEFAULT_HOOK_MAX_DURATION', 20);
  }

  detectPlatform(url: string): DetectPlatformResponse {
    if (!url?.trim()) return { platform: 'unknown', supported: false };
    const info = this.platform.detect(url);
    return {
      platform: info.platform,
      supported: info.supported,
      videoId: info.videoId,
    };
  }

  // ── Sequential clip processor (memory-safe) ────────────────────────────────
  private async processHooksSequentially(
    hooks: HookCandidate[],
    videoPath: string,
    recordId: string,
    mode: 'merge' | 'hook-only',
  ): Promise<Array<HookCandidate & { clip: { url: string } | null }>> {
    const results: Array<HookCandidate & { clip: { url: string } | null }> = [];

    for (let i = 0; i < hooks.length; i++) {
      const hook = hooks[i];
      this.logger.log(
        `Step 5.${i + 1}: Extracting clip | rank=${hook.rank} | ${hook.startTime}s→${hook.endTime}s`,
      );

      let clipPath: string | null = null;
      let processedPath: string | null = null;

      try {
        clipPath = await this.ffmpeg.extractClip(videoPath, hook.startTime, hook.endTime);

        if (mode === 'merge') {
          processedPath = await this.ffmpeg.mergeWithCrossfade(clipPath, videoPath);
        } else {
          processedPath = await this.ffmpeg.extractHookOnly(clipPath);
        }

        const publicId = mode === 'merge'
          ? `hook-${recordId}-rank${hook.rank}`
          : `hook-only-${recordId}-rank${hook.rank}`;

        const clipUrl = await this.cloudinary.uploadVideo(processedPath, publicId);
        this.logger.log(`Step 5.${i + 1}: ✓ rank=${hook.rank} uploaded | url=${clipUrl}`);
        results.push({ ...hook, clip: { url: clipUrl } });
      } catch (err) {
        this.logger.warn(
          `Step 5.${i + 1}: ✗ rank=${hook.rank} failed | error=${err instanceof Error ? err.message : String(err)}`,
        );
        results.push({ ...hook, clip: null });
      } finally {
        const toClean = [clipPath, processedPath].filter(Boolean) as string[];
        if (toClean.length) this.ffmpeg.cleanup(...toClean);
      }
    }

    return results;
  }

  async analyzeUrl(
    userId: string,
    userEmail: string,
    dto: AnalyzeUrlDto,
  ): Promise<AnalysisResponse> {
    const { video_url } = dto;

    const detected = this.platform.detect(video_url);
    if (!detected.supported) {
      throw new BadRequestException(
        'Unsupported platform. Use YouTube, Google Drive, Rumble, TikTok, or Instagram.',
      );
    }
    this.logger.log(
      `Step 0: Request received | user=${userEmail} | platform=${detected.platform} | url=${video_url}`,
    );

    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_URL_ANALYZE,
      `Video analysis: ${video_url}`,
    );
    this.logger.log(
      `Step 1: Credit deducted | user=${userEmail} | spent=${COST_URL_ANALYZE} | remaining=${creditsRemaining}`,
    );

    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        sourceUrl: video_url,
        platform: detected.platform as AnalysisPlatform,
        status: 'processing',
        creditsUsed: COST_URL_ANALYZE,
      }),
    );
    this.logger.log(`Step 1: Analysis record created | id=${record.id}`);

    let videoPath: string | null = null;

    try {
      // ── Step 2: Fetch transcript ───────────────────────────────────────────
      this.logger.log(`Step 2: Fetching transcript | platform=${detected.platform}`);

      const videoId = video_url.match(YOUTUBE_ID_RE)?.[1];
      let transcriptResult = videoId
        ? await this.transcript.fromYoutube(videoId)
        : null;

      if (!transcriptResult) {
        this.logger.log(`Step 2: No captions found — downloading for Whisper`);
        videoPath = await this.downloader.download(video_url);
        transcriptResult = await this.transcript.fromWhisper(videoPath);
      }

      const { segments, source } = transcriptResult;
      if (!segments?.length) {
        throw new InternalServerErrorException(
          'No transcript text could be extracted from this video.',
        );
      }

      // const { segments: rawSegments, source } = transcriptResult;
      // let segments = rawSegments;

      // if (!segments?.length) {
      //   this.logger.warn(`No transcript — using duration-based fallback`);
      //   const duration = await this.ffmpeg.getVideoDuration(videoPath!);
      //   if (duration < 5) {
      //     throw new InternalServerErrorException('Video is too short to extract hooks from.');
      //   }
      //   segments = this.transcript.generateDurationBasedSegments(duration, this.minDuration);
      //   this.logger.log(`Duration-based fallback: ${segments.length} synthetic segments`);
      // }

      this.logger.log(
        `Step 2: Transcript ready | source=${source} | segments=${segments.length}`,
      );

      // ── Step 3: Score hooks ────────────────────────────────────────────────
      const minDur = dto.min_hook_duration ?? this.minDuration;
      const maxDur = dto.max_hook_duration ?? this.maxDuration;

      this.logger.log(
        `Step 3: Scoring hook candidates via Claude | duration=${minDur}–${maxDur}s`,
      );

      const { hooks } = await this.hookScoring.selectTopHooks(
        segments,
        minDur,
        maxDur,
        source,
      );

      if (!hooks?.length) {
        throw new InternalServerErrorException(
          'Claude could not identify any hook candidates in this video.',
        );
      }

      const topHooks = hooks.slice(0, MAX_HOOKS_ANALYZE);
      const best = topHooks[0];
      this.logger.log(
        `Step 3: Hooks scored | best score=${best.hookScore} (${best.hookScoreLabel}) | ${best.startTime}s→${best.endTime}s`,
      );

      // ── Step 4: Download video ─────────────────────────────────────────────
      if (!videoPath) {
        this.logger.log(`Step 4: Downloading video for clip extraction`);
        videoPath = await this.downloader.download(video_url);
        this.logger.log(`Step 4: Download complete`);
      } else {
        this.logger.log(`Step 4: Video already downloaded`);
      }

      // ── Step 4b: Duration-based credit deduction ───────────────────────────────
      const { durationSeconds } = await this.deductDurationCredits(
        userId, userEmail, videoPath, `analyze ${video_url}`, record.id,
      );

      // ── Step 5: Extract clips sequentially ────────────────────────────────
      this.logger.log(`Step 5: Extracting clips for top ${topHooks.length} hooks (sequential)`);
      const processedHooks = await this.processHooksSequentially(
        topHooks,
        videoPath,
        record.id,
        'merge',
      );

      const bestHookWithClip = processedHooks[0];
      const bestClipUrl = (bestHookWithClip.clip as { url: string } | null)?.url ?? null;

      if (!bestClipUrl) {
        throw new InternalServerErrorException(
          'Failed to generate clip for the best hook. Please try again.',
        );
      }

      this.logger.log(
        `Step 5: All clips processed | ${processedHooks.filter((h) => h.clip).length}/${topHooks.length} succeeded`,
      );

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
        videoDurationSeconds: durationSeconds,  
      });

      this.logger.log(
        `✅ Done | user=${userEmail} | id=${record.id} | score=${bestHookWithClip.hookScore} | clip=${bestClipUrl}`,
      );

      const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
      return this.toResponse(updated, creditsRemaining);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`✗ Failed | user=${userEmail} | id=${record.id} | error=${message}`);
      await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
      await this.refundCredit(userId, userEmail, COST_URL_ANALYZE, record.id);
      throw err;
    } finally {
      if (videoPath) {
        this.ffmpeg.cleanup(videoPath);
        this.logger.log(`Cleanup: removed video temp file`);
      }
    }
  }

  async analyzeUpload(
    userId: string,
    userEmail: string,
    file: Express.Multer.File,
    body: Record<string, string>,
  ): Promise<AnalysisResponse> {
    if (!file) throw new BadRequestException('No video file provided');

    this.logger.log(
      `Step 0: Upload received | user=${userEmail} | file=${file.originalname} | size=${(file.size / 1024 / 1024).toFixed(1)}MB`,
    );

    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_UPLOAD_ANALYZE,
      `Video upload analysis: ${file.originalname}`,
    );
    this.logger.log(
      `Step 1: Credits deducted | user=${userEmail} | spent=${COST_UPLOAD_ANALYZE} | remaining=${creditsRemaining}`,
    );

    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        platform: 'upload',
        status: 'processing',
        creditsUsed: COST_UPLOAD_ANALYZE,
        videoTitle: file.originalname,
      }),
    );
    this.logger.log(`Step 1: Analysis record created | id=${record.id}`);

    let hookPath: string | null = null;
    let mergedPath: string | null = null;

    try {
      this.logger.log(`Step 2: Transcribing audio via Whisper | path=${file.path}`);
      const { segments, source } = await this.transcript.fromWhisper(file.path);

      if (!segments?.length) {
        throw new InternalServerErrorException('No speech detected in this video.');
      }

      // const { segments: rawSegments, source } = await this.transcript.fromWhisper(file.path);

      // let segments = rawSegments;

      // if (!segments?.length) {
      //   this.logger.warn(`No transcript found — using duration-based fallback`);
      //   const duration = await this.ffmpeg.getVideoDuration(file.path);
      //   if (duration < 5) {
      //     throw new InternalServerErrorException('Video is too short to extract hooks from.');
      //   }
      //   segments = this.transcript.generateDurationBasedSegments(duration, this.minDuration);
      //   this.logger.log(`Duration-based fallback: ${segments.length} synthetic segments`);
      // }

      this.logger.log(`Step 2: Transcript ready | segments=${segments.length}`);

      const { durationSeconds } = await this.deductDurationCredits(
        userId, userEmail, file.path, `upload ${file.originalname}`, record.id,
      );

      const minDur = body.min_hook_duration ? parseInt(body.min_hook_duration, 10) : this.minDuration;
      const maxDur = body.max_hook_duration ? parseInt(body.max_hook_duration, 10) : this.maxDuration;

      this.logger.log(
        `Step 3: Scoring hook candidates via Claude | duration=${minDur}–${maxDur}s`,
      );

      const { hooks } = await this.hookScoring.selectTopHooks(segments, minDur, maxDur, source);

      if (!hooks?.length) {
        throw new InternalServerErrorException('Claude could not identify any hook candidates.');
      }

      const best = hooks[0];
      this.logger.log(
        `Step 3: Hooks scored | best score=${best.hookScore} | ${best.startTime}s→${best.endTime}s`,
      );

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
        fullHooks: hooks.slice(0, MAX_HOOKS_ANALYZE),
        videoTitle: file.originalname,
        videoDurationSeconds: durationSeconds,  
      });

      this.logger.log(`✅ Done | user=${userEmail} | id=${record.id} | clip=${clipUrl}`);

      const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
      return this.toResponse(updated, creditsRemaining);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`✗ Failed | user=${userEmail} | id=${record.id} | error=${message}`);
      await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
      await this.refundCredit(userId, userEmail, COST_UPLOAD_ANALYZE, record.id);
      throw err;
    } finally {
      const toClean = [hookPath, mergedPath, file.path].filter(Boolean) as string[];
      if (toClean.length) {
        this.ffmpeg.cleanup(...toClean);
        this.logger.log(`Cleanup: removed ${toClean.length} temp file(s)`);
      }
    }
  }

  async rebuild(
    userId: string,
    userEmail: string,
    dto: RebuildDto,
  ): Promise<AnalysisResponse> {
    this.logger.log(
      `Step 0: Rebuild request | user=${userEmail} | analysisId=${dto.analysisId} | hookRank=${dto.hookRank ?? 1}`,
    );

    const original = await this.findOwnedAnalysis(userId, dto.analysisId);

    if (!original.fullHooks?.length) {
      throw new BadRequestException('Original analysis has no hooks to rebuild from');
    }

    const hookRank = dto.hookRank ?? 1;
    const hooks = original.fullHooks as HookCandidate[];
    const chosenHook = hooks.find((h) => h.rank === hookRank);
    if (!chosenHook) {
      throw new BadRequestException(`Hook rank ${hookRank} not found in original analysis`);
    }

    this.logger.log(
      `Step 1: Hook selected | rank=${hookRank} | score=${chosenHook.hookScore} | ${chosenHook.startTime}s→${chosenHook.endTime}s`,
    );

    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_REBUILD,
      `Rebuild hook rank ${hookRank} from analysis ${dto.analysisId}`,
    );
    this.logger.log(
      `Step 2: Credits deducted | user=${userEmail} | spent=${COST_REBUILD} | remaining=${creditsRemaining}`,
    );

    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        sourceUrl: original.sourceUrl,
        platform: original.platform,
        status: 'processing',
        creditsUsed: COST_REBUILD,
        videoTitle: original.videoTitle,
      }),
    );

    let videoPath: string | null = null;
    let hookPath: string | null = null;
    let mergedPath: string | null = null;

    try {
      this.logger.log(`Step 3: Downloading video for rebuild`);
      videoPath = await this.downloader.download(original.sourceUrl!);

      const { durationSeconds } = await this.deductDurationCredits(
        userId, userEmail, videoPath, `rebuild ${original.sourceUrl}`, record.id,
      );

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
        videoDurationSeconds: durationSeconds,  
      });

      this.logger.log(`✅ Rebuild done | user=${userEmail} | id=${record.id} | clip=${clipUrl}`);

      const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
      return this.toResponse(updated, creditsRemaining);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`✗ Rebuild failed | user=${userEmail} | id=${record.id} | error=${message}`);
      await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
      await this.refundCredit(userId, userEmail, COST_REBUILD, record.id);
      throw err;
    } finally {
      const toClean = [videoPath, hookPath, mergedPath].filter(Boolean) as string[];
      if (toClean.length) this.ffmpeg.cleanup(...toClean);
    }
  }

  async extractClip(
    userId: string,
    userEmail: string,
    dto: ExtractClipDto,
  ): Promise<AnalysisResponse> {
    this.logger.log(
      `Step 0: Clip extract | user=${userEmail} | analysisId=${dto.analysisId} | ${dto.startTime}s→${dto.endTime}s`,
    );

    const original = await this.findOwnedAnalysis(userId, dto.analysisId);
    const duration = dto.endTime - dto.startTime;

    if (duration < 1 || duration > 120) {
      throw new BadRequestException('Clip duration must be between 1 and 120 seconds');
    }

    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_CLIP,
      `Extract clip [${dto.startTime}s → ${dto.endTime}s] from ${dto.analysisId}`,
    );

    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        sourceUrl: original.sourceUrl,
        platform: original.platform,
        status: 'processing',
        creditsUsed: COST_CLIP,
        videoTitle: original.videoTitle,
      }),
    );

    let videoPath: string | null = null;
    let clipPath: string | null = null;

    try {
      this.logger.log(`Step 1: Downloading video`);
      videoPath = await this.downloader.download(original.sourceUrl!);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`✗ Clip extract failed | user=${userEmail} | id=${record.id} | error=${message}`);
      await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
      await this.refundCredit(userId, userEmail, COST_CLIP, record.id);
      throw err;
    } finally {
      const toClean = [videoPath, clipPath].filter(Boolean) as string[];
      if (toClean.length) this.ffmpeg.cleanup(...toClean);
    }
  }

  async hookOnly(
    userId: string,
    userEmail: string,
    dto: HookOnlyDto,
  ): Promise<AnalysisResponse> {
    const { video_url } = dto;

    const detected = this.platform.detect(video_url);
    if (!detected.supported) {
      throw new BadRequestException('Unsupported platform.');
    }

    this.logger.log(
      `Step 0: Hook-only request | user=${userEmail} | platform=${detected.platform} | url=${video_url}`,
    );

    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_URL_ANALYZE,
      `Hook-only analysis: ${video_url}`,
    );
    this.logger.log(
      `Step 1: Credit deducted | user=${userEmail} | spent=${COST_URL_ANALYZE} | remaining=${creditsRemaining}`,
    );

    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        sourceUrl: video_url,
        platform: detected.platform as AnalysisPlatform,
        status: 'processing',
        creditsUsed: COST_URL_ANALYZE,
      }),
    );

    let videoPath: string | null = null;

    try {
      // ── Step 2: Transcript ─────────────────────────────────────────────────
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
        throw new InternalServerErrorException('No transcript found in this video.');
      }

      // const { segments: rawSegments, source } = transcriptResult;
      // let segments = rawSegments;

      // if (!segments?.length) {
      //   this.logger.warn(`No transcript — using duration-based fallback`);
      //   const duration = await this.ffmpeg.getVideoDuration(videoPath!);
      //   if (duration < 5) {
      //     throw new InternalServerErrorException('Video is too short to extract hooks from.');
      //   }
      //   segments = this.transcript.generateDurationBasedSegments(duration, this.minDuration);
      //   this.logger.log(`Duration-based fallback: ${segments.length} synthetic segments`);
      // }

      this.logger.log(`Step 2: Transcript ready | source=${source} | segments=${segments.length}`);

      // ── Step 3: Score hooks ────────────────────────────────────────────────
      const minDur = dto.min_hook_duration ?? this.minDuration;
      const maxDur = dto.max_hook_duration ?? this.maxDuration;

      this.logger.log(`Step 3: Scoring hooks via Claude | duration=${minDur}–${maxDur}s`);
      const { hooks } = await this.hookScoring.selectTopHooks(segments, minDur, maxDur, source);

      if (!hooks?.length) {
        throw new InternalServerErrorException('Claude could not identify any hooks.');
      }

      const topHooks = hooks.slice(0, MAX_HOOKS_HOOK_ONLY);
      const best = topHooks[0];
      this.logger.log(
        `Step 3: Best hook | score=${best.hookScore} (${best.hookScoreLabel}) | ${best.startTime}s→${best.endTime}s`,
      );

      // ── Step 4: Download video ─────────────────────────────────────────────
      if (!videoPath) {
        this.logger.log(`Step 4: Downloading video`);
        videoPath = await this.downloader.download(video_url);
        this.logger.log(`Step 4: Download complete`);
      } else {
        this.logger.log(`Step 4: Video already downloaded`);
      }

      // ---- Step 4b ---------------------------------------
      const { durationSeconds } = await this.deductDurationCredits(
        userId, userEmail, videoPath, `hook-only ${video_url}`, record.id,
      );

      // ── Step 5: Extract clips sequentially ────────────────────────────────
      this.logger.log(`Step 5: Extracting hook-only clips for top ${topHooks.length} hooks (sequential)`);
      const processedHooks = await this.processHooksSequentially(
        topHooks,
        videoPath,
        record.id,
        'hook-only',
      );

      const bestHook = processedHooks[0];
      const bestClipUrl = (bestHook.clip as { url: string } | null)?.url ?? null;

      if (!bestClipUrl) {
        throw new InternalServerErrorException('Failed to generate hook clip. Please try again.');
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
        videoDurationSeconds: durationSeconds,  
      });

      this.logger.log(
        `✅ Hook-only done | user=${userEmail} | id=${record.id} | score=${bestHook.hookScore} | clip=${bestClipUrl}`,
      );

      const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
      return this.toResponse(updated, creditsRemaining);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`✗ Hook-only failed | user=${userEmail} | id=${record.id} | error=${message}`);
      await this.analyses.update(record.id, { status: 'failed', errorMessage: message });
      await this.refundCredit(userId, userEmail, COST_URL_ANALYZE, record.id);
      throw err;
    } finally {
      if (videoPath) {
        this.ffmpeg.cleanup(videoPath);
        this.logger.log(`Cleanup: removed video temp file`);
      }
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async findOwnedAnalysis(userId: string, id: string): Promise<AnalysisEntity> {
    const record = await this.analyses.findOne({ where: { id, userId } });
    if (!record) throw new NotFoundException(`Analysis ${id} not found`);
    return record;
  }

  private async refundCredit(
    userId: string,
    userEmail: string,
    amount: number,
    analysisId: string,
  ): Promise<void> {
    try {
      await this.users.increment({ id: userId }, 'credits', amount);
      this.logger.log(
        `Credit refunded | user=${userEmail} | amount=${amount} | analysisId=${analysisId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to refund credit | user=${userEmail} | error=${String(err)}`,
      );
    }
  }

  private async deductDurationCredits(
    userId: string,
    userEmail: string,
    videoPath: string,
    baseDescription: string,
    recordId: string,
  ): Promise<{ durationSeconds: number; extraCredits: number }> {
    const durationSeconds = await this.ffmpeg.getVideoDuration(videoPath);
    const minutes = durationSeconds / 60;

    const tier = DURATION_TIERS.find((t) => durationSeconds >= t.minSeconds);

    if (!tier) {
      this.logger.log(
        `Video duration: ${minutes.toFixed(1)}min — no extra credits needed`,
      );
      return { durationSeconds, extraCredits: 0 };
    }

    this.logger.log(
      `Video duration: ${minutes.toFixed(1)}min — deducting ${tier.extraCredits} extra credit(s)`,
    );

    await this.credits.spendCredits(
      userId,
      tier.extraCredits,
      `Extra credits for ${minutes.toFixed(1)}min video (${baseDescription})`,
      recordId,
    );

    return { durationSeconds, extraCredits: tier.extraCredits };
  }

  private toResponse(record: AnalysisEntity, creditsRemaining: number): AnalysisResponse {
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
      fullHooks: record.fullHooks as HookDto[] | null,
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
}