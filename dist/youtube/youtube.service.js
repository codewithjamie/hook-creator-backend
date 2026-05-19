"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var YoutubeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const path = require("path");
const uuid_1 = require("uuid");
const YOUTUBE_URL_REGEX = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
let YoutubeService = YoutubeService_1 = class YoutubeService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(YoutubeService_1.name);
        this.uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
    }
    extractVideoId(url) {
        const match = url.match(YOUTUBE_URL_REGEX);
        if (!match?.[1]) {
            throw new common_1.BadRequestException(`Could not extract video ID from URL: ${url}. ` +
                `Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...`);
        }
        return match[1];
    }
    isYoutubeUrl(url) {
        return YOUTUBE_URL_REGEX.test(url) || url.includes('youtube.com') || url.includes('youtu.be');
    }
    async download(url) {
        const videoId = this.extractVideoId(url);
        const outputPath = path.join(this.uploadDir, `yt-${videoId}-${(0, uuid_1.v4)().slice(0, 6)}.mp4`);
        this.logger.log(`Downloading YouTube video ${videoId} → ${outputPath}`);
        const metadata = await this.getMetadata(url);
        await this.runYtDlp([
            '--no-playlist',
            '--format',
            'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best',
            '--merge-output-format',
            'mp4',
            '--output',
            outputPath,
            '--no-warnings',
            '--quiet',
            url,
        ]);
        this.logger.log(`YouTube download complete: ${outputPath}`);
        return {
            localPath: outputPath,
            title: metadata.title,
            platform: 'youtube',
            sourceUrl: url,
            durationSeconds: metadata.duration,
        };
    }
    async getMetadata(url) {
        const raw = await this.runYtDlp([
            '--no-playlist',
            '--dump-json',
            '--no-warnings',
            '--quiet',
            url,
        ]);
        try {
            const meta = JSON.parse(raw);
            return {
                title: meta.title ?? meta.fulltitle ?? 'Untitled',
                duration: meta.duration ?? 0,
            };
        }
        catch {
            return { title: 'Untitled', duration: 0 };
        }
    }
    runYtDlp(args) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('yt-dlp', args);
            const stdoutChunks = [];
            const stderrChunks = [];
            proc.stdout?.on('data', (d) => stdoutChunks.push(d));
            proc.stderr?.on('data', (d) => stderrChunks.push(d));
            proc.on('error', (err) => {
                if (err.code === 'ENOENT') {
                    reject(new common_1.InternalServerErrorException('yt-dlp not found. Please install it in the deployment environment.'));
                }
                else {
                    reject(new common_1.InternalServerErrorException(`yt-dlp error: ${err.message}`));
                }
            });
            proc.on('close', (code) => {
                const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
                const stderr = Buffer.concat(stderrChunks).toString('utf-8');
                if (code === 0) {
                    resolve(stdout);
                }
                else {
                    const stderrTail = stderr.split('\n').slice(-4).join('\n').trim();
                    this.logger.error(`yt-dlp exit ${code}: ${stderrTail}`);
                    if (stderrTail.includes('Video unavailable')) {
                        reject(new common_1.BadRequestException('YouTube video is unavailable (private, deleted, or region-locked).'));
                    }
                    else if (stderrTail.includes('Sign in to confirm')) {
                        reject(new common_1.BadRequestException('YouTube requires sign-in for this video (age-gated content).'));
                    }
                    else {
                        reject(new common_1.InternalServerErrorException(`YouTube download failed: ${stderrTail}`));
                    }
                }
            });
        });
    }
};
exports.YoutubeService = YoutubeService;
exports.YoutubeService = YoutubeService = YoutubeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YoutubeService);
//# sourceMappingURL=youtube.service.js.map