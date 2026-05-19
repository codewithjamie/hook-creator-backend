import { ConfigService } from '@nestjs/config';
export declare class VideoDownloaderService {
    private readonly config;
    private readonly logger;
    private readonly uploadDir;
    constructor(config: ConfigService);
    download(url: string): Promise<string>;
    cleanup(...paths: string[]): Promise<void>;
    private runYtDlp;
}
