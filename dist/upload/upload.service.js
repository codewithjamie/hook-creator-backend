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
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const util_1 = require("util");
const uuid_1 = require("uuid");
const renameAsync = (0, util_1.promisify)(fs.rename);
const mkdirAsync = (0, util_1.promisify)(fs.mkdir);
let UploadService = UploadService_1 = class UploadService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(UploadService_1.name);
        this.uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
        mkdirAsync(this.uploadDir, { recursive: true }).catch(() => { });
    }
    async processUpload(file) {
        const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
        const safeName = `upload-${(0, uuid_1.v4)()}${ext}`;
        const destPath = path.join(this.uploadDir, safeName);
        this.logger.log(`Processing upload: ${file.originalname} ` +
            `(${(file.size / 1024 / 1024).toFixed(1)} MB) → ${destPath}`);
        if (file.path) {
            await renameAsync(file.path, destPath);
        }
        else if (file.buffer) {
            await fs.promises.writeFile(destPath, file.buffer);
        }
        else {
            throw new Error('Multer file has neither path nor buffer — check multer configuration');
        }
        return {
            localPath: destPath,
            title: path.basename(file.originalname, ext),
            platform: 'upload',
        };
    }
    async cleanup(localPath) {
        try {
            await fs.promises.unlink(localPath);
            this.logger.debug(`Cleaned up uploaded file: ${localPath}`);
        }
        catch (err) {
            this.logger.warn(`Failed to cleanup ${localPath}: ${String(err)}`);
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadService);
//# sourceMappingURL=upload.service.js.map