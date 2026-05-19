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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const analyze_service_1 = require("./analyze.service");
const analyze_dto_1 = require("./dto/analyze.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let AnalyzeController = class AnalyzeController {
    constructor(analyzeService) {
        this.analyzeService = analyzeService;
    }
    detect(url) {
        return this.analyzeService.detectPlatform(url);
    }
    analyze(req, dto) {
        return this.analyzeService.analyzeUrl(req.user.id, req.user.email, dto);
    }
    uploadAnalyze(req, file, body) {
        return this.analyzeService.analyzeUpload(req.user.id, req.user.email, file, body);
    }
    hookOnly(req, dto) {
        return this.analyzeService.hookOnly(req.user.id, req.user.email, dto);
    }
    rebuild(req, dto) {
        return this.analyzeService.rebuild(req.user.id, req.user.email, dto);
    }
    extractClip(req, dto) {
        return this.analyzeService.extractClip(req.user.id, req.user.email, dto);
    }
};
exports.AnalyzeController = AnalyzeController;
__decorate([
    (0, common_1.Get)('detect'),
    (0, swagger_1.ApiOperation)({ summary: 'Detect platform from URL (public)' }),
    (0, swagger_1.ApiQuery)({ name: 'url', example: 'https://www.youtube.com/watch?v=abc123' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: analyze_dto_1.DetectPlatformResponse }),
    openapi.ApiResponse({ status: 200, type: require("./dto/analyze.dto").DetectPlatformResponse }),
    __param(0, (0, common_1.Query)('url')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", analyze_dto_1.DetectPlatformResponse)
], AnalyzeController.prototype, "detect", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Extract best hook clip — costs 1 credit' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: analyze_dto_1.AnalysisResponse }),
    (0, swagger_1.ApiResponse)({ status: 402, description: 'Insufficient credits' }),
    openapi.ApiResponse({ status: 200, type: require("./dto/analyze.dto").AnalysisResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analyze_dto_1.AnalyzeUrlDto]),
    __metadata("design:returntype", Promise)
], AnalyzeController.prototype, "analyze", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('videoFile')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['videoFile'],
            properties: {
                videoFile: { type: 'string', format: 'binary' },
                min_hook_duration: { type: 'number', example: 6 },
                max_hook_duration: { type: 'number', example: 12 },
                transcript_source: { type: 'string', enum: ['auto', 'youtube_captions', 'whisper'] },
            },
        },
    }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a video file and extract best hook — costs 3 credits' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: analyze_dto_1.AnalysisResponse }),
    (0, swagger_1.ApiResponse)({ status: 402, description: 'Insufficient credits' }),
    openapi.ApiResponse({ status: 201, type: require("./dto/analyze.dto").AnalysisResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AnalyzeController.prototype, "uploadAnalyze", null);
__decorate([
    (0, common_1.Post)('hook-only'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Extract hook clips only — no merge with full video — costs 1 credit' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: analyze_dto_1.AnalysisResponse }),
    (0, swagger_1.ApiResponse)({ status: 402, description: 'Insufficient credits' }),
    openapi.ApiResponse({ status: 200, type: require("./dto/analyze.dto").AnalysisResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analyze_dto_1.HookOnlyDto]),
    __metadata("design:returntype", Promise)
], AnalyzeController.prototype, "hookOnly", null);
__decorate([
    (0, common_1.Post)('rebuild'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Rebuild video with a different hook — costs 3 credits' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: analyze_dto_1.AnalysisResponse }),
    (0, swagger_1.ApiResponse)({ status: 402, description: 'Insufficient credits' }),
    openapi.ApiResponse({ status: 201, type: require("./dto/analyze.dto").AnalysisResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analyze_dto_1.RebuildDto]),
    __metadata("design:returntype", Promise)
], AnalyzeController.prototype, "rebuild", null);
__decorate([
    (0, common_1.Post)('clip'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Extract a specific clip on demand — costs 1 credit' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: analyze_dto_1.AnalysisResponse }),
    (0, swagger_1.ApiResponse)({ status: 402, description: 'Insufficient credits' }),
    openapi.ApiResponse({ status: 201, type: require("./dto/analyze.dto").AnalysisResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analyze_dto_1.ExtractClipDto]),
    __metadata("design:returntype", Promise)
], AnalyzeController.prototype, "extractClip", null);
exports.AnalyzeController = AnalyzeController = __decorate([
    (0, swagger_1.ApiTags)('analyze'),
    (0, common_1.Controller)('analyze'),
    __metadata("design:paramtypes", [analyze_service_1.AnalyzeService])
], AnalyzeController);
//# sourceMappingURL=analyze.controller.js.map