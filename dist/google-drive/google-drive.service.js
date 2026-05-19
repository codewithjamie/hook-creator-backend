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
var GoogleDriveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
const GDRIVE_REGEX = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=))([a-zA-Z0-9_-]{25,})/;
let GoogleDriveService = GoogleDriveService_1 = class GoogleDriveService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GoogleDriveService_1.name);
        this.uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
    }
    isGoogleDriveUrl(url) {
        return GDRIVE_REGEX.test(url);
    }
    extractFileId(url) {
        const match = url.match(GDRIVE_REGEX);
        if (!match?.[1]) {
            throw new common_1.BadRequestException(`Could not extract Google Drive file ID from: ${url}`);
        }
        return match[1];
    }
    async download(url) {
        const fileId = this.extractFileId(url);
        const outputPath = path.join(this.uploadDir, `gdrive-${(0, uuid_1.v4)()}.mp4`);
        this.logger.log(`Downloading Google Drive file ${fileId} → ${outputPath}`);
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        try {
            const firstResponse = await axios_1.default.get(downloadUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; OpenEdge/2.0; +https://openedge.ai)',
                },
            });
            let videoBuffer;
            const contentType = firstResponse.headers['content-type'] ?? '';
            if (contentType.includes('text/html')) {
                const html = firstResponse.data.toString('utf-8');
                const confirmMatch = html.match(/confirm=([0-9A-Za-z_]+)/);
                if (!confirmMatch) {
                    throw new common_1.BadRequestException('Google Drive file requires sign-in or is not publicly shared.');
                }
                const confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmMatch[1]}`;
                const confirmResponse = await axios_1.default.get(confirmUrl, {
                    responseType: 'arraybuffer',
                    maxRedirects: 5,
                });
                videoBuffer = Buffer.from(confirmResponse.data);
            }
            else {
                videoBuffer = Buffer.from(firstResponse.data);
            }
            await fs.promises.writeFile(outputPath, videoBuffer);
            this.logger.log(`Google Drive download complete: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);
            return {
                localPath: outputPath,
                title: `GDrive-${fileId}`,
                platform: 'google_drive',
                sourceUrl: url,
            };
        }
        catch (err) {
            if (axios_1.default.isAxiosError(err)) {
                throw new common_1.BadRequestException(`Failed to download Google Drive file: ${err.message}. ` +
                    `Ensure the file is publicly shared.`);
            }
            throw new common_1.InternalServerErrorException(String(err));
        }
    }
};
exports.GoogleDriveService = GoogleDriveService;
exports.GoogleDriveService = GoogleDriveService = GoogleDriveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleDriveService);
//# sourceMappingURL=google-drive.service.js.map