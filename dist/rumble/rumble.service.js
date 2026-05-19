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
var RumbleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RumbleService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const path = require("path");
const uuid_1 = require("uuid");
const RUMBLE_URL_REGEX = /rumble\.com\/(?:embed\/|v[a-z0-9]+|.*\/[a-z0-9-]+\.html)/i;
let RumbleService = RumbleService_1 = class RumbleService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RumbleService_1.name);
        this.uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
    }
    isRumbleUrl(url) {
        return RUMBLE_URL_REGEX.test(url);
    }
    async download(url) {
        const outputPath = path.join(this.uploadDir, `rumble-${(0, uuid_1.v4)()}.mp4`);
        this.logger.log(`Downloading Rumble video → ${outputPath}`);
        await this.runYtDlp([
            '--format',
            'best[ext=mp4]/best',
            '--output',
            outputPath,
            '--no-warnings',
            '--quiet',
            url,
        ]);
        let title = 'Rumble Video';
        try {
            const metaRaw = await this.runYtDlp([
                '--dump-json', '--no-warnings', '--quiet', url,
            ]);
            const meta = JSON.parse(metaRaw);
            title = meta.title ?? title;
        }
        catch { }
        return {
            localPath: outputPath,
            title,
            platform: 'rumble',
            sourceUrl: url,
        };
    }
    runYtDlp(args) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('yt-dlp', args);
            const out = [];
            const err = [];
            proc.stdout?.on('data', (d) => out.push(d));
            proc.stderr?.on('data', (d) => err.push(d));
            proc.on('close', (code) => {
                if (code === 0)
                    return resolve(Buffer.concat(out).toString());
                const msg = Buffer.concat(err).toString().split('\n').slice(-3).join('\n');
                reject(new common_1.BadRequestException(`Rumble download failed: ${msg}`));
            });
            proc.on('error', (e) => reject(e));
        });
    }
};
exports.RumbleService = RumbleService;
exports.RumbleService = RumbleService = RumbleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RumbleService);
//# sourceMappingURL=rumble.service.js.map