import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AnalysisEntity } from './entities/analysis.entity';
import { CreditsService } from '../credits/credits.service';
import { AnalyzeUrlDto, RebuildDto, ExtractClipDto, DetectPlatformResponse, AnalysisResponse } from './dto/analyze.dto';
export declare class AnalyzeService {
    private readonly analyses;
    private readonly credits;
    private readonly config;
    private readonly logger;
    private readonly minDuration;
    private readonly maxDuration;
    constructor(analyses: Repository<AnalysisEntity>, credits: CreditsService, config: ConfigService);
    detectPlatform(url: string): DetectPlatformResponse;
    analyzeUrl(userId: string, dto: AnalyzeUrlDto): Promise<AnalysisResponse>;
    analyzeUpload(userId: string, file: Express.Multer.File, body: Record<string, string>): Promise<AnalysisResponse>;
    rebuild(userId: string, dto: RebuildDto): Promise<AnalysisResponse>;
    extractClip(userId: string, dto: ExtractClipDto): Promise<AnalysisResponse>;
    private findOwnedAnalysis;
    private toResponse;
    private runPipeline;
}
