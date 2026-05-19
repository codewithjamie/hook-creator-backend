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
exports.AnalyzeMeta = exports.AnalyzeResponse = exports.AnalyzeRequestDto = exports.HookDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class HookDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { rank: { required: true, type: () => Number }, startTime: { required: true, type: () => Number, minimum: 0 }, endTime: { required: true, type: () => Number, minimum: 0 }, bridgeSentence: { required: true, type: () => String }, whySelected: { required: true, type: () => String }, hookScore: { required: true, type: () => Number, minimum: 0, maximum: 100 }, startSentence: { required: true, type: () => String }, endSentence: { required: true, type: () => String } };
    }
}
exports.HookDto = HookDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], HookDto.prototype, "rank", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], HookDto.prototype, "startTime", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], HookDto.prototype, "endTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HookDto.prototype, "bridgeSentence", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HookDto.prototype, "whySelected", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], HookDto.prototype, "hookScore", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HookDto.prototype, "startSentence", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HookDto.prototype, "endSentence", void 0);
class AnalyzeRequestDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { video_url: { required: false, type: () => String }, min_hook_duration: { required: false, type: () => Number, minimum: 3, maximum: 30 }, max_hook_duration: { required: false, type: () => Number, minimum: 5, maximum: 60 }, transcript_source: { required: false, type: () => Object } };
    }
}
exports.AnalyzeRequestDto = AnalyzeRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyzeRequestDto.prototype, "video_url", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(3),
    (0, class_validator_1.Max)(30),
    (0, class_transformer_1.Transform)(({ value }) => (value !== undefined ? Number(value) : undefined)),
    __metadata("design:type", Number)
], AnalyzeRequestDto.prototype, "min_hook_duration", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(5),
    (0, class_validator_1.Max)(60),
    (0, class_transformer_1.Transform)(({ value }) => (value !== undefined ? Number(value) : undefined)),
    __metadata("design:type", Number)
], AnalyzeRequestDto.prototype, "max_hook_duration", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['auto', 'youtube_captions', 'whisper']),
    __metadata("design:type", String)
], AnalyzeRequestDto.prototype, "transcript_source", void 0);
class AnalyzeResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { clipUrl: { required: true, type: () => String }, startTime: { required: true, type: () => Number }, endTime: { required: true, type: () => Number }, bridgeSentence: { required: true, type: () => String }, whySelected: { required: true, type: () => String }, hookScore: { required: true, type: () => Number }, transcriptSource: { required: true, type: () => Object }, fullHooks: { required: true, type: () => [require("./analyze.dto").HookDto] }, meta: { required: true, type: () => require("./analyze.dto").AnalyzeMeta } };
    }
}
exports.AnalyzeResponse = AnalyzeResponse;
class AnalyzeMeta {
    static _OPENAPI_METADATA_FACTORY() {
        return { processingTimeMs: { required: true, type: () => Number }, videoTitle: { required: false, type: () => String }, platform: { required: true, type: () => Object }, videoDurationSeconds: { required: false, type: () => Number } };
    }
}
exports.AnalyzeMeta = AnalyzeMeta;
//# sourceMappingURL=analyze.dto.js.map