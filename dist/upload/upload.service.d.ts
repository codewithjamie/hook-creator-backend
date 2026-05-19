import { ConfigService } from '@nestjs/config';
import type { VideoSource } from '../common/dto/analyze.dto';
export declare class UploadService {
    private readonly config;
    private readonly logger;
    private readonly uploadDir;
    constructor(config: ConfigService);
    processUpload(file: Express.Multer.File): Promise<VideoSource>;
    cleanup(localPath: string): Promise<void>;
}
