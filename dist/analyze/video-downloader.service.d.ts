import { ConfigService } from '@nestjs/config';
export declare class VideoDownloaderService {
    private readonly config;
    private readonly logger;
    private readonly uploadDir;
    private readonly cookiesPath;
    constructor(config: ConfigService);
    private writeCookies;
    private get hasCookies();
    download(url: string): Promise<string>;
    private resolveRumbleUrl;
    private scrapeRumbleEmbed;
    private downloadDirectUrl;
    private buildArgs;
    cleanup(...paths: string[]): Promise<void>;
    private runYtDlp;
}
