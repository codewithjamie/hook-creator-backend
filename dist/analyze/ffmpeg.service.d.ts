import { ConfigService } from '@nestjs/config';
export declare class FfmpegService {
    private readonly config;
    private readonly logger;
    private readonly uploadDir;
    private readonly ffmpegPath;
    private readonly ffprobePath;
    constructor(config: ConfigService);
    getDuration(filePath: string): Promise<number>;
    extractClip(sourcePath: string, startTime: number, endTime: number): Promise<string>;
    mergeWithCrossfade(hookPath: string, fullVideoPath: string): Promise<string>;
    private mergeWithCrossfadeNoSound;
    extractAudioMp3(videoPath: string): Promise<string>;
    cleanup(...paths: string[]): void;
    extractHookOnly(hookPath: string): Promise<string>;
    private runCommand;
}
