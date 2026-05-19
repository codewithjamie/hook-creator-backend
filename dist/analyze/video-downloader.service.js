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
var VideoDownloaderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoDownloaderService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const path = require("path");
const fs = require("fs");
const uuid_1 = require("uuid");
let VideoDownloaderService = VideoDownloaderService_1 = class VideoDownloaderService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(VideoDownloaderService_1.name);
        this.uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
        fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    async download(url) {
        const outputPath = path.join(this.uploadDir, `video-${(0, uuid_1.v4)()}.mp4`);
        this.logger.log(`Downloading video → ${outputPath}`);
        await this.runYtDlp([
            '--no-playlist',
            '--format', 'best[height<=720][ext=mp4]/best[height<=720]/best',
            '--output', outputPath,
            '--no-warnings',
            '--socket-timeout', '30',
            '--retries', '3',
            '--fragment-retries', '3',
            url,
        ]);
        this.logger.log(`Download complete → ${outputPath}`);
        return outputPath;
    }
    async cleanup(...paths) {
        for (const p of paths) {
            try {
                if (fs.existsSync(p))
                    fs.unlinkSync(p);
            }
            catch { }
        }
    }
    runYtDlp(args) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('yt-dlp', args);
            const err = [];
            proc.stderr?.on('data', (d) => err.push(d));
            proc.on('close', (code) => {
                if (code === 0)
                    return resolve();
                const msg = Buffer.concat(err).toString().split('\n').slice(-3).join('\n');
                reject(new common_1.InternalServerErrorException(`yt-dlp failed: ${msg}`));
            });
            proc.on('error', () => reject(new common_1.InternalServerErrorException('yt-dlp not found. Install it in PATH.')));
        });
    }
};
exports.VideoDownloaderService = VideoDownloaderService;
exports.VideoDownloaderService = VideoDownloaderService = VideoDownloaderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VideoDownloaderService);
//# sourceMappingURL=video-downloader.service.js.map