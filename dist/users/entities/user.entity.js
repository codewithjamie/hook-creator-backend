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
exports.UserEntity = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const class_transformer_1 = require("class-transformer");
const analysis_entity_1 = require("../../analyze/entities/analysis.entity");
const credit_transaction_entity_1 = require("../../credits/entities/credit-transaction.entity");
let UserEntity = class UserEntity {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, email: { required: true, type: () => String }, name: { required: true, type: () => String }, passwordHash: { required: true, type: () => String }, resetPasswordToken: { required: true, type: () => String, nullable: true }, stripeCustomerId: { required: true, type: () => String, nullable: true }, credits: { required: true, type: () => Number }, resetPasswordExpires: { required: true, type: () => Date, nullable: true }, emailVerified: { required: true, type: () => Boolean }, createdAt: { required: true, type: () => Date }, updatedAt: { required: true, type: () => Date }, analyses: { required: true, type: () => [require("../../analyze/entities/analysis.entity").AnalysisEntity] }, verificationCode: { required: true, type: () => String, nullable: true }, verificationCodeExpires: { required: true, type: () => Date, nullable: true }, creditTransactions: { required: true, type: () => [require("../../credits/entities/credit-transaction.entity").CreditTransactionEntity] } };
    }
};
exports.UserEntity = UserEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], UserEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UserEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], UserEntity.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "resetPasswordToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "stripeCustomerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], UserEntity.prototype, "credits", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", Object)
], UserEntity.prototype, "resetPasswordExpires", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], UserEntity.prototype, "emailVerified", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], UserEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], UserEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => analysis_entity_1.AnalysisEntity, (a) => a.user),
    __metadata("design:type", Array)
], UserEntity.prototype, "analyses", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 6, nullable: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "verificationCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "verificationCodeExpires", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => credit_transaction_entity_1.CreditTransactionEntity, (t) => t.user),
    __metadata("design:type", Array)
], UserEntity.prototype, "creditTransactions", void 0);
exports.UserEntity = UserEntity = __decorate([
    (0, typeorm_1.Entity)('users')
], UserEntity);
//# sourceMappingURL=user.entity.js.map