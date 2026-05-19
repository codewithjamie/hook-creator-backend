export interface PlatformInfo {
    platform: string;
    label: string;
    supported: boolean;
    videoId?: string;
}
export declare class PlatformService {
    private readonly logger;
    detect(url: string): PlatformInfo;
    fetchVideoTitle(url: string, platform: string): Promise<string | null>;
}
