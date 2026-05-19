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
var CloudinaryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const fs = require("fs");
let CloudinaryService = CloudinaryService_1 = class CloudinaryService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(CloudinaryService_1.name);
        this.folder = config.get('CLOUDINARY_FOLDER', 'openedge-clips');
        cloudinary_1.v2.config({
            cloud_name: config.getOrThrow('CLOUDINARY_CLOUD_NAME'),
            api_key: config.getOrThrow('CLOUDINARY_API_KEY'),
            api_secret: config.getOrThrow('CLOUDINARY_API_SECRET'),
        });
        this.logger.log(`Cloudinary configured — cloud: ${config.get('CLOUDINARY_CLOUD_NAME')}`);
    }
    async uploadVideo(localPath, publicId) {
        this.logger.log(`Uploading to Cloudinary: ${localPath}`);
        return new Promise((resolve, reject) => {
            const stream = cloudinary_1.v2.uploader.upload_stream({
                resource_type: 'video',
                folder: this.folder,
                public_id: publicId,
                overwrite: true,
                eager: [
                    { format: 'mp4', quality: 'auto', fetch_format: 'auto' },
                ],
                eager_async: false,
            }, (error, result) => {
                if (error) {
                    this.logger.error(`Cloudinary upload failed: ${error.message}`);
                    reject(new common_1.InternalServerErrorException(`Failed to upload clip to Cloudinary: ${error.message}`));
                    return;
                }
                if (!result?.secure_url) {
                    reject(new common_1.InternalServerErrorException('Cloudinary returned no URL after upload.'));
                    return;
                }
                this.logger.log(`Cloudinary upload success → ${result.secure_url}`);
                resolve(result.secure_url);
            });
            const fileStream = fs.createReadStream(localPath);
            fileStream.on('error', (err) => {
                reject(new common_1.InternalServerErrorException(`Failed to read video file for upload: ${err.message}`));
            });
            fileStream.pipe(stream);
        });
    }
    async deleteVideo(publicId) {
        try {
            await cloudinary_1.v2.uploader.destroy(publicId, { resource_type: 'video' });
        }
        catch (err) {
            this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${String(err)}`);
        }
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = CloudinaryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryService);
//# sourceMappingURL=cloudinary.service.js.map