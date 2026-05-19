import { ConfigService } from '@nestjs/config';
import type { FfprobeData } from '../common/dto/analyze.dto';
export declare class FfmpegService {
    private readonly config;
    private readonly logger;
    private readonly uploadDir;
    private readonly ffmpegPath;
    private readonly ffprobePath;
    constructor(config: ConfigService);
    probe(filePath: string): Promise<FfprobeData>;
    extractClip(sourcePath: string, startTime: number, endTime: number): Promise<string>;
    mergeWithCrossfade(hookPath: string, fullVideoPath: string): Promise<string>;
    ensureAudioTrack(sourcePath: string): Promise<string>;
    cleanup(...filePaths: Array<string | undefined>): Promise<void>;
    private tempPath;
    private ensureUploadDir;
    private runCommand;
}
