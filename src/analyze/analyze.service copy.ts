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
import {
  AnalyzeUrlDto,
  RebuildDto,
  ExtractClipDto,
  DetectPlatformResponse,
  AnalysisResponse,
  HookDto,
} from './dto/analyze.dto';

// Platform detection regexes
const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/;
const RUMBLE_RE = /rumble\.com/;
const GDRIVE_RE = /drive\.google\.com/;
const YOUTUBE_ID_RE = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

// Credit costs
const COST_URL_ANALYZE = 1;
const COST_UPLOAD_ANALYZE = 3;
const COST_REBUILD = 3;
const COST_CLIP = 1;


@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  private readonly minDuration: number;
  private readonly maxDuration: number;

  constructor(
    @InjectRepository(AnalysisEntity)
    private readonly analyses: Repository<AnalysisEntity>,
    private readonly credits: CreditsService,
    private readonly config: ConfigService,
  ) {
    this.minDuration = config.get<number>('DEFAULT_HOOK_MIN_DURATION', 6);
    this.maxDuration = config.get<number>('DEFAULT_HOOK_MAX_DURATION', 12);
  }

  detectPlatform(url: string): DetectPlatformResponse {
    if (!url?.trim()) return { platform: 'unknown', supported: false };
    if (YOUTUBE_RE.test(url)) {
      return {
        platform: 'youtube',
        supported: true,
        videoId: url.match(YOUTUBE_ID_RE)?.[1],
      };
    }
    if (RUMBLE_RE.test(url)) return { platform: 'rumble', supported: true };
    if (GDRIVE_RE.test(url)) return { platform: 'google_drive', supported: true };
    return { platform: 'generic', supported: true };
  }

  async analyzeUrl(userId: string, dto: AnalyzeUrlDto): Promise<AnalysisResponse> {
    const detected = this.detectPlatform(dto.video_url);
    const platform = detected.platform as AnalysisPlatform;

    // Create a pending record before deducting credits
    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        sourceUrl: dto.video_url,
        platform,
        status: 'pending',
        creditsUsed: COST_URL_ANALYZE,
      }),
    );

    // Deduct credits — throws 402 if insufficient
    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_URL_ANALYZE,
      `Video analysis: ${dto.video_url}`,
      record.id,
    );

    // Mark as processing
    await this.analyses.update(record.id, { status: 'processing' });

    try {
      // ── HERE: wire your full pipeline ──────────────────────────────────
      // const source = await this.youtubeService.download(dto.video_url);
      // const transcript = await this.transcriptService.fromYoutube(...);
      // const hooks = await this.claudeService.selectHooks(transcript);
      // const validated = this.hookValidator.validate(hooks);
      // const { cloudinaryUrl } = await this.videoService.createCrossfadeClip(source.localPath, validated.valid[0]);
      // ───────────────────────────────────────────────────────────────────

      // Placeholder — replace with real pipeline result
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
    } catch (err) {
      // Mark as failed and refund credits
      await this.analyses.update(record.id, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      // TODO: implement credit refund if pipeline fails after deduction
      throw err;
    }
  }

  async analyzeUpload(
    userId: string,
    file: Express.Multer.File,
    body: Record<string, string>,
  ): Promise<AnalysisResponse> {
    if (!file) throw new BadRequestException('No video file provided');

    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        platform: 'upload',
        status: 'pending',
        creditsUsed: COST_UPLOAD_ANALYZE,
        videoTitle: file.originalname,
      }),
    );

    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_UPLOAD_ANALYZE,
      `Video upload analysis: ${file.originalname}`,
      record.id,
    );

    await this.analyses.update(record.id, { status: 'processing' });

    try {
      // ── HERE: wire upload pipeline ──────────────────────────────────────
      // const source = await this.uploadService.processUpload(file);
      // const transcript = await this.transcriptService.fromWhisper(source.localPath);
      // ... same as analyzeUrl from here
      // ───────────────────────────────────────────────────────────────────

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
    } catch (err) {
      await this.analyses.update(record.id, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async rebuild(userId: string, dto: RebuildDto): Promise<AnalysisResponse> {
    const original = await this.findOwnedAnalysis(userId, dto.analysisId);

    if (!original.fullHooks?.length) {
      throw new BadRequestException('Original analysis has no hooks to rebuild from');
    }

    const hookRank = dto.hookRank ?? 1;
    const hooks = original.fullHooks as HookDto[];
    const chosenHook = hooks.find((h) => h.rank === hookRank);

    if (!chosenHook) {
      throw new BadRequestException(`Hook rank ${hookRank} not found in original analysis`);
    }

    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        sourceUrl: original.sourceUrl,
        platform: original.platform,
        status: 'pending',
        creditsUsed: COST_REBUILD,
        videoTitle: original.videoTitle,
      }),
    );

    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_REBUILD,
      `Rebuild hook rank ${hookRank} from analysis ${dto.analysisId}`,
      record.id,
    );

    await this.analyses.update(record.id, { status: 'processing' });

    try {
      // ── HERE: re-run clip creation with chosen hook ─────────────────────
      // const { cloudinaryUrl } = await this.videoService.createCrossfadeClip(
      //   sourceVideoPath, chosenHook
      // );
      // ───────────────────────────────────────────────────────────────────

      await this.analyses.update(record.id, {
        status: 'complete',
        clipUrl: original.clipUrl, // placeholder — replace with new clip
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
    } catch (err) {
      await this.analyses.update(record.id, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async extractClip(userId: string, dto: ExtractClipDto): Promise<AnalysisResponse> {
    const original = await this.findOwnedAnalysis(userId, dto.analysisId);
    const duration = dto.endTime - dto.startTime;

    if (duration < 1 || duration > 120) {
      throw new BadRequestException('Clip duration must be between 1 and 120 seconds');
    }

    const record = await this.analyses.save(
      this.analyses.create({
        userId,
        sourceUrl: original.sourceUrl,
        platform: original.platform,
        status: 'pending',
        creditsUsed: COST_CLIP,
        videoTitle: original.videoTitle,
      }),
    );

    const creditsRemaining = await this.credits.spendCredits(
      userId,
      COST_CLIP,
      `Extract clip [${dto.startTime}s → ${dto.endTime}s] from ${dto.analysisId}`,
      record.id,
    );

    await this.analyses.update(record.id, { status: 'processing' });

    try {
      // ── HERE: extract precise clip ──────────────────────────────────────
      // const clipPath = await this.ffmpegService.extractClip(
      //   sourceVideoPath, dto.startTime, dto.endTime
      // );
      // const cloudinaryUrl = await this.cloudinaryService.uploadVideo(clipPath);
      // ───────────────────────────────────────────────────────────────────

      await this.analyses.update(record.id, {
        status: 'complete',
        clipUrl: original.clipUrl, // placeholder
        startTime: dto.startTime,
        endTime: dto.endTime,
      });

      const updated = await this.analyses.findOneOrFail({ where: { id: record.id } });
      return this.toResponse(updated, creditsRemaining);
    } catch (err) {
      await this.analyses.update(record.id, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOwnedAnalysis(userId: string, id: string): Promise<AnalysisEntity> {
    const record = await this.analyses.findOne({ where: { id, userId } });
    if (!record) throw new NotFoundException(`Analysis ${id} not found`);
    return record;
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

  /**
   * Placeholder — replace this entire method body with real pipeline calls.
   * All the actual YoutubeService / TranscriptService / ClaudeService /
   * VideoService wiring goes here.
   */
  private async runPipeline(dto: { video_url: string }): Promise<{
    clipUrl: string;
    startTime: number;
    endTime: number;
    bridgeSentence: string;
    whySelected: string;
    hookScore: number;
    transcriptSource: 'youtube_captions' | 'whisper';
    fullHooks: HookDto[];
    videoTitle: string;
    videoDurationSeconds: number;
  }> {
    this.logger.warn(
      'runPipeline() is a stub — wire your real pipeline services here',
    );
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
}
