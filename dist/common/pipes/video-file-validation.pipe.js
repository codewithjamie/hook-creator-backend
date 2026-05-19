"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoFileValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const ALLOWED_MIME_TYPES = new Set([
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
    'video/mpeg',
    'video/3gpp',
    'video/x-flv',
    'video/x-ms-wmv',
]);
const ALLOWED_EXTENSIONS = new Set([
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.webm',
    '.mpeg',
    '.mpg',
    '.3gp',
    '.flv',
    '.wmv',
]);
let VideoFileValidationPipe = class VideoFileValidationPipe {
    transform(file, _metadata) {
        if (!file)
            return undefined;
        const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
        const ext = '.' + (file.originalname.split('.').pop() ?? '').toLowerCase();
        const extOk = ALLOWED_EXTENSIONS.has(ext);
        if (!mimeOk && !extOk) {
            throw new common_1.BadRequestException(`Invalid file type "${file.mimetype}". Only video files are accepted (mp4, mov, avi, mkv, webm, etc.)`);
        }
        const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB ?? '500', 10);
        const maxBytes = maxMb * 1024 * 1024;
        if (file.size > maxBytes) {
            throw new common_1.BadRequestException(`File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the ${maxMb} MB limit.`);
        }
        return file;
    }
};
exports.VideoFileValidationPipe = VideoFileValidationPipe;
exports.VideoFileValidationPipe = VideoFileValidationPipe = __decorate([
    (0, common_1.Injectable)()
], VideoFileValidationPipe);
//# sourceMappingURL=video-file-validation.pipe.js.map