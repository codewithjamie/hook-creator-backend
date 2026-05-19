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
exports.HistoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const analysis_entity_1 = require("../analyze/entities/analysis.entity");
let HistoryService = class HistoryService {
    constructor(analyses) {
        this.analyses = analyses;
    }
    async findAll(userId, page, limit) {
        const [items, total] = await this.analyses.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            items: items.map(this.toResponse),
            total,
            page,
            limit,
        };
    }
    async findOne(userId, id) {
        const record = await this.analyses.findOne({ where: { id, userId } });
        if (!record)
            throw new common_1.NotFoundException(`Analysis ${id} not found`);
        return this.toResponse(record);
    }
    async remove(userId, id) {
        const record = await this.analyses.findOne({ where: { id, userId } });
        if (!record)
            throw new common_1.NotFoundException(`Analysis ${id} not found`);
        await this.analyses.remove(record);
    }
    toResponse(record) {
        return {
            id: record.id,
            sourceUrl: record.sourceUrl,
            videoTitle: record.videoTitle,
            clipUrl: record.clipUrl,
            hookScore: record.hookScore,
            startTime: record.startTime,
            endTime: record.endTime,
            bridgeSentence: record.bridgeSentence,
            platform: record.platform,
            status: record.status,
            creditsUsed: record.creditsUsed,
            createdAt: record.createdAt,
        };
    }
};
exports.HistoryService = HistoryService;
exports.HistoryService = HistoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(analysis_entity_1.AnalysisEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], HistoryService);
//# sourceMappingURL=history.service.js.map