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
var CreditsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsService = exports.CREDIT_PACKAGES = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const Stripe = require("stripe");
const user_entity_1 = require("../users/entities/user.entity");
const credit_transaction_entity_1 = require("./entities/credit-transaction.entity");
const email_service_1 = require("../email/email.service");
exports.CREDIT_PACKAGES = [
    {
        id: 'pkg_starter',
        name: 'Starter',
        credits: 10,
        priceUsd: 999,
        label: '$9.99',
        description: 'Perfect for trying out OpenEdge',
    },
    {
        id: 'pkg_pro',
        name: 'Pro',
        credits: 30,
        priceUsd: 2499,
        label: '$24.99',
        description: 'Best value for regular creators',
        popular: true,
    },
    {
        id: 'pkg_studio',
        name: 'Studio',
        credits: 100,
        priceUsd: 6999,
        label: '$69.99',
        description: 'For agencies and power users',
    },
];
let CreditsService = CreditsService_1 = class CreditsService {
    constructor(users, transactions, config, dataSource, email) {
        this.users = users;
        this.transactions = transactions;
        this.config = config;
        this.dataSource = dataSource;
        this.email = email;
        this.logger = new common_1.Logger(CreditsService_1.name);
        this.stripe = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY'));
        this.webhookSecret = config.getOrThrow('STRIPE_WEBHOOK_SECRET');
        this.appUrl = config.get('APP_URL', 'http://localhost:3000');
    }
    async getBalance(userId) {
        const user = await this.users.findOneOrFail({ where: { id: userId } });
        return { userId, credits: user.credits };
    }
    getPackages() {
        return exports.CREDIT_PACKAGES;
    }
    async getTransactions(userId, page, limit) {
        const [items, total] = await this.transactions.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            items: items.map(this.toTransactionResponse),
            total,
            page,
            limit,
        };
    }
    async createCheckout(userId, dto) {
        const pkg = exports.CREDIT_PACKAGES.find((p) => p.id === dto.packageId);
        if (!pkg)
            throw new common_1.BadRequestException(`Unknown package: ${dto.packageId}`);
        const user = await this.users.findOneOrFail({ where: { id: userId } });
        const customerId = await this.ensureStripeCustomer(user);
        const successUrl = dto.successUrl ?? `${this.appUrl}/dashboard?credits=success`;
        const cancelUrl = dto.cancelUrl ?? `${this.appUrl}/dashboard?credits=cancelled`;
        const session = await this.stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: pkg.priceUsd,
                        product_data: {
                            name: `OpenEdge ${pkg.name} — ${pkg.credits} Credits`,
                            description: pkg.description,
                        },
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                userId,
                packageId: pkg.id,
                credits: String(pkg.credits),
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });
        this.logger.log(`Checkout session created for user ${userId}: ${session.id}`);
        return { url: session.url, sessionId: session.id };
    }
    async handleWebhook(sig, rawBody) {
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, sig, this.webhookSecret);
        }
        catch (err) {
            this.logger.error(`Stripe webhook signature verification failed: ${String(err)}`);
            throw new common_1.HttpException('Invalid webhook signature', common_1.HttpStatus.BAD_REQUEST);
        }
        if (event.type === 'checkout.session.completed') {
            await this.handleCheckoutComplete(event.data.object);
        }
        return { received: true };
    }
    async spendCredits(userId, amount, description, analysisId) {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(user_entity_1.UserEntity, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            if (user.credits < amount) {
                throw new common_1.HttpException(`Insufficient credits. You have ${user.credits} but need ${amount}.`, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            const balanceBefore = user.credits;
            user.credits -= amount;
            await manager.save(user);
            const tx = manager.create(credit_transaction_entity_1.CreditTransactionEntity, {
                userId,
                type: 'spend',
                amount: -amount,
                balanceBefore,
                balanceAfter: user.credits,
                description,
                analysisId: analysisId ?? null,
            });
            await manager.save(tx);
            return user.credits;
        });
    }
    async handleCheckoutComplete(session) {
        const { userId, packageId, credits } = session.metadata ?? {};
        if (!userId || !packageId || !credits) {
            this.logger.error('Checkout session missing metadata', session.id);
            return;
        }
        const creditAmount = parseInt(credits, 10);
        await this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(user_entity_1.UserEntity, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user)
                return;
            const balanceBefore = user.credits;
            user.credits += creditAmount;
            await manager.save(user);
            const tx = manager.create(credit_transaction_entity_1.CreditTransactionEntity, {
                userId,
                type: 'purchase',
                amount: creditAmount,
                balanceBefore,
                balanceAfter: user.credits,
                description: `Purchased ${creditAmount} credits (${packageId})`,
                stripeSessionId: session.id,
            });
            await manager.save(tx);
        });
        const user = await this.users.findOne({ where: { id: userId } });
        if (user) {
            const pkg = exports.CREDIT_PACKAGES.find((p) => p.id === packageId);
            await this.email.sendCreditsPurchased(user.email, user.name, creditAmount, pkg?.label ?? `${creditAmount} credits`);
        }
        this.logger.log(`Credits added: ${creditAmount} → user ${userId}`);
    }
    async ensureStripeCustomer(user) {
        if (user.stripeCustomerId)
            return user.stripeCustomerId;
        const customer = await this.stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: { userId: user.id },
        });
        user.stripeCustomerId = customer.id;
        await this.users.save(user);
        return customer.id;
    }
    toTransactionResponse(tx) {
        return {
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            balanceBefore: tx.balanceBefore,
            balanceAfter: tx.balanceAfter,
            description: tx.description,
            createdAt: tx.createdAt,
        };
    }
};
exports.CreditsService = CreditsService;
exports.CreditsService = CreditsService = CreditsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(credit_transaction_entity_1.CreditTransactionEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        typeorm_2.DataSource,
        email_service_1.EmailService])
], CreditsService);
//# sourceMappingURL=credits.service.js.map