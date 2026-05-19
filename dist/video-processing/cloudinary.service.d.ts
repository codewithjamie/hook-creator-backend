import { ConfigService } from '@nestjs/config';
export declare class CloudinaryService {
    private readonly config;
    private readonly logger;
    private readonly folder;
    constructor(config: ConfigService);
    uploadVideo(localPath: string, publicId?: string): Promise<string>;
    deleteVideo(publicId: string): Promise<void>;
}
