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
var VideoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ffmpeg_service_1 = require("./ffmpeg.service");
const cloudinary_service_1 = require("./cloudinary.service");
const uuid_1 = require("uuid");
let VideoService = VideoService_1 = class VideoService {
    constructor(ffmpeg, cloudinary, config) {
        this.ffmpeg = ffmpeg;
        this.cloudinary = cloudinary;
        this.config = config;
        this.logger = new common_1.Logger(VideoService_1.name);
    }
    async createCrossfadeClip(sourceVideoPath, hook) {
        const jobId = (0, uuid_1.v4)().slice(0, 8);
        this.logger.log(`[${jobId}] Creating crossfade clip ` +
            `[${hook.startTime}s → ${hook.endTime}s]`);
        let hookPath;
        let audioSafeSourcePath;
        let audioSafeHookPath;
        let mergedPath;
        try {
            hookPath = await this.ffmpeg.extractClip(sourceVideoPath, hook.startTime, hook.endTime);
            this.logger.debug(`[${jobId}] Hook extracted → ${hookPath}`);
            audioSafeHookPath = await this.ffmpeg.ensureAudioTrack(hookPath);
            audioSafeSourcePath = await this.ffmpeg.ensureAudioTrack(sourceVideoPath);
            mergedPath = await this.ffmpeg.mergeWithCrossfade(audioSafeHookPath, audioSafeSourcePath);
            this.logger.debug(`[${jobId}] Crossfade merge complete → ${mergedPath}`);
            const publicId = `openedge/${jobId}`;
            const cloudinaryUrl = await this.cloudinary.uploadVideo(mergedPath, publicId);
            return { cloudinaryUrl, localMergedPath: mergedPath };
        }
        finally {
            const toDelete = [hookPath];
            if (audioSafeHookPath && audioSafeHookPath !== hookPath) {
                toDelete.push(audioSafeHookPath);
            }
            if (audioSafeSourcePath && audioSafeSourcePath !== sourceVideoPath) {
                toDelete.push(audioSafeSourcePath);
            }
            await this.ffmpeg.cleanup(...toDelete);
        }
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = VideoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ffmpeg_service_1.FfmpegService,
        cloudinary_service_1.CloudinaryService,
        config_1.ConfigService])
], VideoService);
//# sourceMappingURL=video.service.js.map