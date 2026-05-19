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
exports.HistoryController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const history_service_1 = require("./history.service");
const history_dto_1 = require("./dto/history.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let HistoryController = class HistoryController {
    constructor(historyService) {
        this.historyService = historyService;
    }
    findAll(req, page = 1, limit = 20) {
        return this.historyService.findAll(req.user.id, Number(page), Number(limit));
    }
    findOne(req, id) {
        return this.historyService.findOne(req.user.id, id);
    }
    remove(req, id) {
        return this.historyService.remove(req.user.id, id);
    }
};
exports.HistoryController = HistoryController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all past analyses' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    (0, swagger_1.ApiResponse)({ status: 200, type: history_dto_1.HistoryListResponse }),
    openapi.ApiResponse({ status: 200, type: require("./dto/history.dto").HistoryListResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single analysis result' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Analysis UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: history_dto_1.HistoryItemResponse }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    openapi.ApiResponse({ status: 200, type: require("./dto/history.dto").HistoryItemResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an analysis' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Analysis UUID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Deleted' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    openapi.ApiResponse({ status: 204 }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "remove", null);
exports.HistoryController = HistoryController = __decorate([
    (0, swagger_1.ApiTags)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('history'),
    __metadata("design:paramtypes", [history_service_1.HistoryService])
], HistoryController);
//# sourceMappingURL=history.controller.js.map