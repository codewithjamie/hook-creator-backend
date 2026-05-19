"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const config_1 = require("@nestjs/config");
const multer_1 = require("multer");
const path = require("path");
const fs = require("fs");
const uuid_1 = require("uuid");
const upload_service_1 = require("./upload.service");
let UploadModule = class UploadModule {
};
exports.UploadModule = UploadModule;
exports.UploadModule = UploadModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => {
                    const uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
                    fs.mkdirSync(uploadDir, { recursive: true });
                    return {
                        storage: (0, multer_1.diskStorage)({
                            destination: (_req, _file, cb) => cb(null, uploadDir),
                            filename: (_req, file, cb) => {
                                const ext = path.extname(file.originalname).toLowerCase();
                                cb(null, `multer-${(0, uuid_1.v4)()}${ext}`);
                            },
                        }),
                        limits: {
                            fileSize: config.get('MAX_FILE_SIZE_MB', 500) * 1024 * 1024,
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [upload_service_1.UploadService],
        exports: [upload_service_1.UploadService, platform_express_1.MulterModule],
    })
], UploadModule);
//# sourceMappingURL=upload.module.js.map