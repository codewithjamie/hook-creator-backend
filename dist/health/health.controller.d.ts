export declare class HealthController {
    check(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
    checkTools(): Promise<{
        node: {
            ok: boolean;
            version: string;
        };
        runtime: {
            ok: boolean;
            platform: NodeJS.Platform;
            arch: NodeJS.Architecture;
        };
        ffmpeg: {
            ok: boolean;
            version: string;
            error?: undefined;
        } | {
            ok: boolean;
            error: string;
            version?: undefined;
        };
        ytDlp: {
            ok: boolean;
            version: string;
            error?: undefined;
        } | {
            ok: boolean;
            error: string;
            version?: undefined;
        };
    }>;
    private checkTool;
}
