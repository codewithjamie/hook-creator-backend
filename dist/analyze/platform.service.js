"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PlatformService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/;
const RUMBLE_RE = /rumble\.com/;
const GDRIVE_RE = /drive\.google\.com/;
const YOUTUBE_ID_RE = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
let PlatformService = PlatformService_1 = class PlatformService {
    constructor() {
        this.logger = new common_1.Logger(PlatformService_1.name);
    }
    detect(url) {
        if (!url?.trim())
            return { platform: 'unknown', label: 'Unknown', supported: false };
        if (YOUTUBE_RE.test(url)) {
            return {
                platform: 'youtube',
                label: 'YouTube',
                supported: true,
                videoId: url.match(YOUTUBE_ID_RE)?.[1],
            };
        }
        if (RUMBLE_RE.test(url))
            return { platform: 'rumble', label: 'Rumble', supported: true };
        if (GDRIVE_RE.test(url))
            return { platform: 'google_drive', label: 'Google Drive', supported: true };
        return { platform: 'generic', label: 'Video URL', supported: true };
    }
    async fetchVideoTitle(url, platform) {
        try {
            if (platform === 'youtube') {
                const id = url.match(YOUTUBE_ID_RE)?.[1];
                if (!id)
                    return null;
                const res = await axios_1.default.get(`https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${id}&format=json`, { timeout: 5000 });
                return res.data.title ?? null;
            }
            return null;
        }
        catch {
            return null;
        }
    }
};
exports.PlatformService = PlatformService;
exports.PlatformService = PlatformService = PlatformService_1 = __decorate([
    (0, common_1.Injectable)()
], PlatformService);
//# sourceMappingURL=platform.service.js.map