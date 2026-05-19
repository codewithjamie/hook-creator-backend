import { ConfigService } from '@nestjs/config';
import type { VideoSource } from '../common/dto/analyze.dto';
export declare class RumbleService {
    private readonly config;
    private readonly logger;
    private readonly uploadDir;
    constructor(config: ConfigService);
    isRumbleUrl(url: string): boolean;
    download(url: string): Promise<VideoSource>;
    private runYtDlp;
}
