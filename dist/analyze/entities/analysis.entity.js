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
exports.AnalysisEntity = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let AnalysisEntity = class AnalysisEntity {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, sourceUrl: { required: true, type: () => String, nullable: true }, videoTitle: { required: true, type: () => String, nullable: true }, platform: { required: true, type: () => Object }, status: { required: true, type: () => Object }, clipUrl: { required: true, type: () => String, nullable: true }, startTime: { required: true, type: () => Number, nullable: true }, endTime: { required: true, type: () => Number, nullable: true }, bridgeSentence: { required: true, type: () => String, nullable: true }, whySelected: { required: true, type: () => String, nullable: true }, hookScore: { required: true, type: () => Number, nullable: true }, transcriptSource: { required: true, type: () => Object, nullable: true }, fullHooks: { required: true, type: () => [Object], nullable: true }, videoDurationSeconds: { required: true, type: () => Number, nullable: true }, creditsUsed: { required: true, type: () => Number }, errorMessage: { required: true, type: () => String, nullable: true }, createdAt: { required: true, type: () => Date }, user: { required: true, type: () => require("../../users/entities/user.entity").UserEntity }, userId: { required: true, type: () => String } };
    }
};
exports.AnalysisEntity = AnalysisEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "sourceUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "videoTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['youtube', 'rumble', 'google_drive', 'upload'] }),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['pending', 'processing', 'complete', 'failed'], default: 'pending' }),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "clipUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "bridgeSentence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "whySelected", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "hookScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['youtube_captions', 'whisper'], nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "transcriptSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "fullHooks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "videoDurationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], AnalysisEntity.prototype, "creditsUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], AnalysisEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, (u) => u.analyses, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.UserEntity)
], AnalysisEntity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "userId", void 0);
exports.AnalysisEntity = AnalysisEntity = __decorate([
    (0, typeorm_1.Entity)('analyses')
], AnalysisEntity);
//# sourceMappingURL=analysis.entity.js.map