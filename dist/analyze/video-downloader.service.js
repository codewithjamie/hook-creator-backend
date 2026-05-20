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
        this.cookiesPath = path.join(this.uploadDir, 'yt-cookies.txt');
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.writeCookies();
    }
    writeCookies() {
        const content = this.config.get('YOUTUBE_COOKIES');
        if (content) {
            fs.writeFileSync(this.cookiesPath, content, 'utf8');
            this.logger.log('YouTube cookies written to disk');
        }
        else {
            this.logger.warn('YOUTUBE_COOKIES not set — YouTube bot-detection may trigger');
        }
    }
    get hasCookies() {
        return fs.existsSync(this.cookiesPath);
    }
    async download(url) {
        const outputPath = path.join(this.uploadDir, `video-${(0, uuid_1.v4)()}.mp4`);
        this.logger.log(`Downloading video → ${outputPath}`);
        if (url.includes('rumble.com')) {
            try {
                const embedUrl = await this.resolveRumbleUrl(url);
                this.logger.log(`Rumble: using embed URL → ${embedUrl}`);
                await this.runYtDlp(this.buildArgs(embedUrl, outputPath));
                this.logger.log(`Rumble download complete → ${outputPath}`);
                return outputPath;
            }
            catch (err) {
                this.logger.warn(`Rumble embed strategy failed: ${err instanceof Error ? err.message : String(err)} — trying original URL`);
            }
        }
        await this.runYtDlp(this.buildArgs(url, outputPath));
        this.logger.log(`Download complete → ${outputPath}`);
        return outputPath;
    }
    async resolveRumbleUrl(pageUrl) {
        this.logger.log(`Resolving Rumble oEmbed → ${pageUrl}`);
        const oEmbedUrl = `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(pageUrl)}`;
        const res = await fetch(oEmbedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });
        if (!res.ok)
            throw new Error(`Rumble oEmbed returned ${res.status}`);
        const data = await res.json();
        this.logger.log(`Rumble oEmbed response keys: ${Object.keys(data).join(', ')}`);
        const srcMatch = data.html?.match(/src="(https:\/\/rumble\.com\/embed\/[^"]+)"/);
        if (!srcMatch)
            throw new Error('No embed URL in Rumble oEmbed html field');
        return srcMatch[1];
    }
    async scrapeRumbleEmbed(embedUrl) {
        this.logger.log(`Scraping Rumble embed page → ${embedUrl}`);
        const res = await fetch(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://rumble.com',
            },
        });
        if (!res.ok)
            throw new Error(`Rumble embed page returned ${res.status}`);
        const html = await res.text();
        const jsonMatch = html.match(/var\s+videoConfig\s*=\s*(\{[\s\S]*?\});/) ??
            html.match(/"url"\s*:\s*"(https:[^"]+\.mp4[^"]*)"/);
        if (jsonMatch) {
            try {
                const config = JSON.parse(jsonMatch[1]);
                const mp4 = config?.media?.url ?? config?.u;
                if (mp4)
                    return mp4;
            }
            catch {
                if (jsonMatch[1].startsWith('http'))
                    return jsonMatch[1].replace(/\\u0026/g, '&');
            }
        }
        const mp4Match = html.match(/(https:\/\/[^"'\s]+\.mp4[^"'\s]*)/);
        if (mp4Match)
            return mp4Match[1].replace(/\\u0026/g, '&');
        throw new Error('Could not extract MP4 URL from Rumble embed page');
    }
    async downloadDirectUrl(url, outputPath) {
        this.logger.log(`Downloading direct URL → ${outputPath}`);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://rumble.com',
            },
        });
        if (!res.ok)
            throw new Error(`Direct download failed: ${res.status}`);
        if (!res.body)
            throw new Error('No response body');
        const writer = fs.createWriteStream(outputPath);
        const reader = res.body.getReader();
        await new Promise((resolve, reject) => {
            const pump = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            writer.end();
                            break;
                        }
                        writer.write(Buffer.from(value));
                    }
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                }
                catch (err) {
                    writer.destroy();
                    reject(err);
                }
            };
            pump();
        });
    }
    buildArgs(url, outputPath) {
        const args = [
            '--no-playlist',
            '--format', 'best[height<=720][ext=mp4]/best[height<=720]/best',
            '--output', outputPath,
            '--no-warnings',
            '--socket-timeout', '30',
            '--retries', '3',
            '--fragment-retries', '3',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            '--add-header', 'Accept-Language:en-US,en;q=0.9',
        ];
        if (this.hasCookies) {
            args.push('--cookies', this.cookiesPath);
        }
        if (url.includes('rumble.com')) {
            args.push('--add-header', 'Referer:https://rumble.com');
        }
        args.push(url);
        return args;
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