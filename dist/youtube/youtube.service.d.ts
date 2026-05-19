import { ConfigService } from '@nestjs/config';
import type { VideoSource } from '../common/dto/analyze.dto';
export declare class YoutubeService {
    private readonly config;
    private readonly logger;
    private readonly uploadDir;
    constructor(config: ConfigService);
    extractVideoId(url: string): string;
    isYoutubeUrl(url: string): boolean;
    download(url: string): Promise<VideoSource>;
    getMetadata(url: string): Promise<{
        title: string;
        duration: number;
    }>;
    private runYtDlp;
}
