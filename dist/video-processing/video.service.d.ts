import { ConfigService } from '@nestjs/config';
import { FfmpegService } from './ffmpeg.service';
import { CloudinaryService } from './cloudinary.service';
import type { ParsedHook } from '../common/dto/analyze.dto';
export interface ProcessedClip {
    cloudinaryUrl: string;
    localMergedPath: string;
}
export declare class VideoService {
    private readonly ffmpeg;
    private readonly cloudinary;
    private readonly config;
    private readonly logger;
    constructor(ffmpeg: FfmpegService, cloudinary: CloudinaryService, config: ConfigService);
    createCrossfadeClip(sourceVideoPath: string, hook: ParsedHook): Promise<ProcessedClip>;
}
