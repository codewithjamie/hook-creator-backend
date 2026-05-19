"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const platform_express_1 = require("@nestjs/platform-express");
const config_1 = require("@nestjs/config");
const multer_1 = require("multer");
const path = require("path");
const fs = require("fs");
const uuid_1 = require("uuid");
const analyze_controller_1 = require("./analyze.controller");
const analyze_service_1 = require("./analyze.service");
const analysis_entity_1 = require("./entities/analysis.entity");
const user_entity_1 = require("../users/entities/user.entity");
const credits_module_1 = require("../credits/credits.module");
const platform_service_1 = require("./platform.service");
const video_downloader_service_1 = require("./video-downloader.service");
const ffmpeg_service_1 = require("./ffmpeg.service");
const cloudinary_service_1 = require("./cloudinary.service");
const transcript_service_1 = require("./transcript.service");
const hook_scoring_service_1 = require("./hook-scoring.service");
let AnalyzeModule = class AnalyzeModule {
};
exports.AnalyzeModule = AnalyzeModule;
exports.AnalyzeModule = AnalyzeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([analysis_entity_1.AnalysisEntity, user_entity_1.UserEntity]),
            platform_express_1.MulterModule.registerAsync({
                useFactory: (config) => {
                    const dir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
                    fs.mkdirSync(dir, { recursive: true });
                    return {
                        storage: (0, multer_1.diskStorage)({
                            destination: (_req, _file, cb) => cb(null, dir),
                            filename: (_req, file, cb) => cb(null, `${(0, uuid_1.v4)()}${path.extname(file.originalname)}`),
                        }),
                        limits: {
                            fileSize: config.get('MAX_FILE_SIZE_MB', 500) * 1024 * 1024,
                        },
                        fileFilter: (_req, file, cb) => {
                            const allowed = /\.(mp4|mov|avi|mkv|webm|mpeg|3gp)$/i;
                            if (allowed.test(file.originalname))
                                cb(null, true);
                            else
                                cb(new Error('Only video files are allowed'), false);
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            credits_module_1.CreditsModule,
        ],
        controllers: [analyze_controller_1.AnalyzeController],
        providers: [
            analyze_service_1.AnalyzeService,
            platform_service_1.PlatformService,
            video_downloader_service_1.VideoDownloaderService,
            ffmpeg_service_1.FfmpegService,
            cloudinary_service_1.CloudinaryService,
            transcript_service_1.TranscriptService,
            hook_scoring_service_1.HookScoringService,
        ],
        exports: [analyze_service_1.AnalyzeService],
    })
], AnalyzeModule);
//# sourceMappingURL=analyze.module.js.map