import { ConfigService } from '@nestjs/config';
import type { VideoSource } from '../common/dto/analyze.dto';
export declare class GoogleDriveService {
    private readonly config;
    private readonly logger;
    private readonly uploadDir;
    constructor(config: ConfigService);
    isGoogleDriveUrl(url: string): boolean;
    extractFileId(url: string): string;
    download(url: string): Promise<VideoSource>;
}
