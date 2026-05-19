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
exports.CreditTransactionEntity = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let CreditTransactionEntity = class CreditTransactionEntity {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, type: { required: true, type: () => Object }, amount: { required: true, type: () => Number }, balanceBefore: { required: true, type: () => Number }, description: { required: true, type: () => String, nullable: true }, stripeSessionId: { required: true, type: () => String, nullable: true }, analysisId: { required: true, type: () => String, nullable: true }, balanceAfter: { required: true, type: () => Number }, createdAt: { required: true, type: () => Date }, user: { required: true, type: () => require("../../users/entities/user.entity").UserEntity }, userId: { required: true, type: () => String } };
    }
};
exports.CreditTransactionEntity = CreditTransactionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CreditTransactionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['purchase', 'spend', 'refund', 'bonus'] }),
    __metadata("design:type", String)
], CreditTransactionEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CreditTransactionEntity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CreditTransactionEntity.prototype, "balanceBefore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CreditTransactionEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CreditTransactionEntity.prototype, "stripeSessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CreditTransactionEntity.prototype, "analysisId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CreditTransactionEntity.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], CreditTransactionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, (u) => u.creditTransactions, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.UserEntity)
], CreditTransactionEntity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CreditTransactionEntity.prototype, "userId", void 0);
exports.CreditTransactionEntity = CreditTransactionEntity = __decorate([
    (0, typeorm_1.Entity)('credit_transactions')
], CreditTransactionEntity);
//# sourceMappingURL=credit-transaction.entity.js.map