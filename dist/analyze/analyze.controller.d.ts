import { AnalyzeService } from './analyze.service';
import { AnalyzeUrlDto, RebuildDto, ExtractClipDto, DetectPlatformResponse, AnalysisResponse, HookOnlyDto } from './dto/analyze.dto';
export declare class AnalyzeController {
    private readonly analyzeService;
    constructor(analyzeService: AnalyzeService);
    detect(url: string): DetectPlatformResponse;
    analyze(req: {
        user: {
            id: string;
            email: string;
        };
    }, dto: AnalyzeUrlDto): Promise<AnalysisResponse>;
    uploadAnalyze(req: {
        user: {
            id: string;
            email: string;
        };
    }, file: Express.Multer.File, body: Record<string, string>): Promise<AnalysisResponse>;
    hookOnly(req: {
        user: {
            id: string;
            email: string;
        };
    }, dto: HookOnlyDto): Promise<AnalysisResponse>;
    rebuild(req: {
        user: {
            id: string;
            email: string;
        };
    }, dto: RebuildDto): Promise<AnalysisResponse>;
    extractClip(req: {
        user: {
            id: string;
            email: string;
        };
    }, dto: ExtractClipDto): Promise<AnalysisResponse>;
}
