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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookOnlyDto = exports.AnalysisResponse = exports.HookDto = exports.DetectPlatformResponse = exports.ExtractClipDto = exports.RebuildDto = exports.AnalyzeUrlDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class AnalyzeUrlDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { video_url: { required: true, type: () => String }, min_hook_duration: { required: false, type: () => Number, minimum: 3, maximum: 30 }, max_hook_duration: { required: false, type: () => Number, minimum: 5, maximum: 60 }, transcript_source: { required: false, type: () => Object } };
    }
}
exports.AnalyzeUrlDto = AnalyzeUrlDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyzeUrlDto.prototype, "video_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 6, minimum: 3, maximum: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(3),
    (0, class_validator_1.Max)(30),
    (0, class_transformer_1.Transform)(({ value }) => value !== undefined ? Number(value) : undefined),
    __metadata("design:type", Number)
], AnalyzeUrlDto.prototype, "min_hook_duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 12, minimum: 5, maximum: 60 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(5),
    (0, class_validator_1.Max)(60),
    (0, class_transformer_1.Transform)(({ value }) => value !== undefined ? Number(value) : undefined),
    __metadata("design:type", Number)
], AnalyzeUrlDto.prototype, "max_hook_duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['auto', 'youtube_captions', 'whisper'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['auto', 'youtube_captions', 'whisper']),
    __metadata("design:type", String)
], AnalyzeUrlDto.prototype, "transcript_source", void 0);
class RebuildDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { analysisId: { required: true, type: () => String }, hookRank: { required: false, type: () => Number, minimum: 1, maximum: 6 } };
    }
}
exports.RebuildDto = RebuildDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Analysis ID from a previous /analyze call' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RebuildDto.prototype, "analysisId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Hook rank to use (1–6), default is 1 (best)', example: 2 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], RebuildDto.prototype, "hookRank", void 0);
class ExtractClipDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { analysisId: { required: true, type: () => String }, startTime: { required: true, type: () => Number }, endTime: { required: true, type: () => Number } };
    }
}
exports.ExtractClipDto = ExtractClipDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Analysis ID to extract a clip from' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ExtractClipDto.prototype, "analysisId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 42.5 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ExtractClipDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 51.2 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ExtractClipDto.prototype, "endTime", void 0);
class DetectPlatformResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { platform: { required: true, type: () => String }, supported: { required: true, type: () => Boolean }, videoId: { required: false, type: () => String } };
    }
}
exports.DetectPlatformResponse = DetectPlatformResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'youtube', enum: ['youtube', 'rumble', 'google_drive', 'generic'] }),
    __metadata("design:type", String)
], DetectPlatformResponse.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], DetectPlatformResponse.prototype, "supported", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'dQw4w9WgXcQ' }),
    __metadata("design:type", String)
], DetectPlatformResponse.prototype, "videoId", void 0);
class HookDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { rank: { required: true, type: () => Number }, startTime: { required: true, type: () => Number }, endTime: { required: true, type: () => Number }, bridgeSentence: { required: true, type: () => String }, whySelected: { required: true, type: () => String }, hookScore: { required: true, type: () => Number }, startSentence: { required: true, type: () => String }, endSentence: { required: true, type: () => String }, clip: { required: true, type: () => ({ url: { required: true, type: () => String } }), nullable: true } };
    }
}
exports.HookDto = HookDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HookDto.prototype, "rank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HookDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HookDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], HookDto.prototype, "bridgeSentence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], HookDto.prototype, "whySelected", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HookDto.prototype, "hookScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], HookDto.prototype, "startSentence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], HookDto.prototype, "endSentence", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], HookDto.prototype, "clip", void 0);
class AnalysisResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, status: { required: true, type: () => String }, clipUrl: { required: true, type: () => String, nullable: true }, startTime: { required: true, type: () => Number, nullable: true }, endTime: { required: true, type: () => Number, nullable: true }, bridgeSentence: { required: true, type: () => String, nullable: true }, whySelected: { required: true, type: () => String, nullable: true }, hookScore: { required: true, type: () => Number, nullable: true }, transcriptSource: { required: true, type: () => String, nullable: true }, fullHooks: { required: true, type: () => [require("./analyze.dto").HookDto], nullable: true }, creditsUsed: { required: true, type: () => Number }, creditsRemaining: { required: true, type: () => Number }, videoTitle: { required: true, type: () => String, nullable: true }, videoDurationSeconds: { required: true, type: () => Number, nullable: true }, platform: { required: true, type: () => String }, sourceUrl: { required: true, type: () => String, nullable: true }, errorMessage: { required: true, type: () => String, nullable: true }, createdAt: { required: true, type: () => Date } };
    }
}
exports.AnalysisResponse = AnalysisResponse;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AnalysisResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['pending', 'processing', 'complete', 'failed'] }),
    __metadata("design:type", String)
], AnalysisResponse.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "clipUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "bridgeSentence", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "whySelected", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "hookScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['youtube_captions', 'whisper'] }),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "transcriptSource", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [HookDto] }),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "fullHooks", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AnalysisResponse.prototype, "creditsUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AnalysisResponse.prototype, "creditsRemaining", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "videoTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "videoDurationSeconds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['youtube', 'rumble', 'google_drive', 'upload'] }),
    __metadata("design:type", String)
], AnalysisResponse.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "sourceUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], AnalysisResponse.prototype, "errorMessage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], AnalysisResponse.prototype, "createdAt", void 0);
class HookOnlyDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { video_url: { required: true, type: () => String }, min_hook_duration: { required: false, type: () => Number, minimum: 3, maximum: 30 }, max_hook_duration: { required: false, type: () => Number, minimum: 5, maximum: 60 }, transcript_source: { required: false, type: () => Object } };
    }
}
exports.HookOnlyDto = HookOnlyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://www.youtube.com/watch?v=abc123' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HookOnlyDto.prototype, "video_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 6, minimum: 3, maximum: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(3),
    (0, class_validator_1.Max)(30),
    (0, class_transformer_1.Transform)(({ value }) => value !== undefined ? Number(value) : undefined),
    __metadata("design:type", Number)
], HookOnlyDto.prototype, "min_hook_duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 12, minimum: 5, maximum: 60 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(5),
    (0, class_validator_1.Max)(60),
    (0, class_transformer_1.Transform)(({ value }) => value !== undefined ? Number(value) : undefined),
    __metadata("design:type", Number)
], HookOnlyDto.prototype, "max_hook_duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['auto', 'youtube_captions', 'whisper'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['auto', 'youtube_captions', 'whisper']),
    __metadata("design:type", String)
], HookOnlyDto.prototype, "transcript_source", void 0);
//# sourceMappingURL=analyze.dto.js.map