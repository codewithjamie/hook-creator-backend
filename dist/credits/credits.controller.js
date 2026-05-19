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
exports.CreditsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const credits_service_1 = require("./credits.service");
const credits_dto_1 = require("./dto/credits.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let CreditsController = class CreditsController {
    constructor(creditsService) {
        this.creditsService = creditsService;
    }
    getBalance(req) {
        return this.creditsService.getBalance(req.user.id);
    }
    getPackages() {
        return this.creditsService.getPackages();
    }
    getTransactions(req, page = 1, limit = 20) {
        return this.creditsService.getTransactions(req.user.id, Number(page), Number(limit));
    }
    createCheckout(req, dto) {
        return this.creditsService.createCheckout(req.user.id, dto);
    }
    stripeWebhook(sig, req) {
        return this.creditsService.handleWebhook(sig, req.rawBody);
    }
};
exports.CreditsController = CreditsController;
__decorate([
    (0, common_1.Get)('balance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current credit balance' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: credits_dto_1.CreditBalanceResponse }),
    openapi.ApiResponse({ status: 200, type: require("./dto/credits.dto").CreditBalanceResponse }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('packages'),
    (0, swagger_1.ApiOperation)({ summary: 'List available credit packages (public)' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [credits_dto_1.CreditPackage] }),
    openapi.ApiResponse({ status: 200, type: [require("./dto/credits.dto").CreditPackage] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], CreditsController.prototype, "getPackages", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'List credit transaction history' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    (0, swagger_1.ApiResponse)({ status: 200, type: credits_dto_1.TransactionListResponse }),
    openapi.ApiResponse({ status: 200, type: require("./dto/credits.dto").TransactionListResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('checkout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe checkout session — buy credits' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: credits_dto_1.CheckoutSessionResponse }),
    openapi.ApiResponse({ status: 201, type: require("./dto/credits.dto").CheckoutSessionResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, credits_dto_1.CreateCheckoutDto]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Stripe webhook receiver (internal — called by Stripe only)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Headers)('stripe-signature')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "stripeWebhook", null);
exports.CreditsController = CreditsController = __decorate([
    (0, swagger_1.ApiTags)('credits'),
    (0, common_1.Controller)('credits'),
    __metadata("design:paramtypes", [credits_service_1.CreditsService])
], CreditsController);
//# sourceMappingURL=credits.controller.js.map