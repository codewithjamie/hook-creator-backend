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
exports.TransactionListResponse = exports.CreditTransactionResponse = exports.CheckoutSessionResponse = exports.CreateCheckoutDto = exports.CreditPackage = exports.CreditBalanceResponse = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreditBalanceResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { credits: { required: true, type: () => Number }, userId: { required: true, type: () => String } };
    }
}
exports.CreditBalanceResponse = CreditBalanceResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    __metadata("design:type", Number)
], CreditBalanceResponse.prototype, "credits", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CreditBalanceResponse.prototype, "userId", void 0);
class CreditPackage {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, name: { required: true, type: () => String }, credits: { required: true, type: () => Number }, priceUsd: { required: true, type: () => Number }, label: { required: true, type: () => String }, description: { required: true, type: () => String }, popular: { required: false, type: () => Boolean } };
    }
}
exports.CreditPackage = CreditPackage;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'pkg_starter' }),
    __metadata("design:type", String)
], CreditPackage.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Starter' }),
    __metadata("design:type", String)
], CreditPackage.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    __metadata("design:type", Number)
], CreditPackage.prototype, "credits", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 999, description: 'Price in USD cents' }),
    __metadata("design:type", Number)
], CreditPackage.prototype, "priceUsd", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '$9.99' }),
    __metadata("design:type", String)
], CreditPackage.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Great for trying out OpenEdge' }),
    __metadata("design:type", String)
], CreditPackage.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    __metadata("design:type", Boolean)
], CreditPackage.prototype, "popular", void 0);
class CreateCheckoutDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { packageId: { required: true, type: () => String }, successUrl: { required: false, type: () => String }, cancelUrl: { required: false, type: () => String } };
    }
}
exports.CreateCheckoutDto = CreateCheckoutDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'pkg_starter', description: 'ID from GET /credits/packages' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "packageId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL to redirect to after successful payment' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "successUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL to redirect to if payment is cancelled' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "cancelUrl", void 0);
class CheckoutSessionResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { url: { required: true, type: () => String }, sessionId: { required: true, type: () => String } };
    }
}
exports.CheckoutSessionResponse = CheckoutSessionResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Redirect user to this Stripe URL' }),
    __metadata("design:type", String)
], CheckoutSessionResponse.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CheckoutSessionResponse.prototype, "sessionId", void 0);
class CreditTransactionResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, type: { required: true, type: () => String }, amount: { required: true, type: () => Number }, balanceBefore: { required: true, type: () => Number }, balanceAfter: { required: true, type: () => Number }, description: { required: true, type: () => String, nullable: true }, createdAt: { required: true, type: () => Date } };
    }
}
exports.CreditTransactionResponse = CreditTransactionResponse;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CreditTransactionResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['purchase', 'spend', 'refund', 'bonus'] }),
    __metadata("design:type", String)
], CreditTransactionResponse.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CreditTransactionResponse.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CreditTransactionResponse.prototype, "balanceBefore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CreditTransactionResponse.prototype, "balanceAfter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], CreditTransactionResponse.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], CreditTransactionResponse.prototype, "createdAt", void 0);
class TransactionListResponse {
    static _OPENAPI_METADATA_FACTORY() {
        return { items: { required: true, type: () => [require("./credits.dto").CreditTransactionResponse] }, total: { required: true, type: () => Number }, page: { required: true, type: () => Number }, limit: { required: true, type: () => Number } };
    }
}
exports.TransactionListResponse = TransactionListResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreditTransactionResponse] }),
    __metadata("design:type", Array)
], TransactionListResponse.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionListResponse.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionListResponse.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionListResponse.prototype, "limit", void 0);
//# sourceMappingURL=credits.dto.js.map