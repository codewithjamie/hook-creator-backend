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
exports.HistoryListResponse = exports.HistoryItemResponse = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
class HistoryItemResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, sourceUrl: { required: true, type: () => String, nullable: true }, videoTitle: { required: true, type: () => String, nullable: true }, clipUrl: { required: true, type: () => String, nullable: true }, hookScore: { required: true, type: () => Number, nullable: true }, startTime: { required: true, type: () => Number, nullable: true }, endTime: { required: true, type: () => Number, nullable: true }, bridgeSentence: { required: true, type: () => String, nullable: true }, platform: { required: true, type: () => String }, status: { required: true, type: () => String }, creditsUsed: { required: true, type: () => Number }, createdAt: { required: true, type: () => Date } };
    }
}
exports.HistoryItemResponse = HistoryItemResponse;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], HistoryItemResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], HistoryItemResponse.prototype, "sourceUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], HistoryItemResponse.prototype, "videoTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], HistoryItemResponse.prototype, "clipUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], HistoryItemResponse.prototype, "hookScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], HistoryItemResponse.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], HistoryItemResponse.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], HistoryItemResponse.prototype, "bridgeSentence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['youtube', 'rumble', 'google_drive', 'upload'] }),
    __metadata("design:type", String)
], HistoryItemResponse.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['pending', 'processing', 'complete', 'failed'] }),
    __metadata("design:type", String)
], HistoryItemResponse.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HistoryItemResponse.prototype, "creditsUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], HistoryItemResponse.prototype, "createdAt", void 0);
class HistoryListResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { items: { required: true, type: () => [require("./history.dto").HistoryItemResponse] }, total: { required: true, type: () => Number }, page: { required: true, type: () => Number }, limit: { required: true, type: () => Number } };
    }
}
exports.HistoryListResponse = HistoryListResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [HistoryItemResponse] }),
    __metadata("design:type", Array)
], HistoryListResponse.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HistoryListResponse.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HistoryListResponse.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], HistoryListResponse.prototype, "limit", void 0);
//# sourceMappingURL=history.dto.js.map