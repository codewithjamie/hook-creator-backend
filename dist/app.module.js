"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const Joi = require("joi");
const user_entity_1 = require("./users/entities/user.entity");
const analysis_entity_1 = require("./analyze/entities/analysis.entity");
const credit_transaction_entity_1 = require("./credits/entities/credit-transaction.entity");
const health_module_1 = require("./health/health.module");
const auth_module_1 = require("./auth/auth.module");
const credits_module_1 = require("./credits/credits.module");
const analyze_module_1 = require("./analyze/analyze.module");
const history_module_1 = require("./history/history.module");
const email_module_1 = require("./email/email.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
                validationSchema: Joi.object({
                    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
                    PORT: Joi.number().default(3000),
                    DATABASE_URL: Joi.string().required(),
                    JWT_SECRET: Joi.string().min(32).required(),
                    ANTHROPIC_API_KEY: Joi.string().required(),
                    OPENAI_API_KEY: Joi.string().required(),
                    CLOUDINARY_CLOUD_NAME: Joi.string().required(),
                    CLOUDINARY_API_KEY: Joi.string().required(),
                    CLOUDINARY_API_SECRET: Joi.string().required(),
                    STRIPE_SECRET_KEY: Joi.string().required(),
                    STRIPE_WEBHOOK_SECRET: Joi.string().required(),
                    RESEND_API_KEY: Joi.string().required(),
                    EMAIL_FROM: Joi.string().default('OpenEdge <noreply@openegdeai.com>'),
                    APP_URL: Joi.string().default('http://localhost:3000'),
                    MAX_FILE_SIZE_MB: Joi.number().default(500),
                    UPLOAD_DIR: Joi.string().default('/tmp/openedge-uploads'),
                    THROTTLE_TTL: Joi.number().default(60),
                    THROTTLE_LIMIT: Joi.number().default(20),
                }),
                validationOptions: { abortEarly: false },
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: (config) => ({
                    type: 'postgres',
                    url: config.getOrThrow('DATABASE_URL'),
                    entities: [user_entity_1.UserEntity, analysis_entity_1.AnalysisEntity, credit_transaction_entity_1.CreditTransactionEntity],
                    synchronize: config.get('NODE_ENV') !== 'production',
                    ssl: { rejectUnauthorized: false },
                    extra: {
                        max: 10,
                        connectionTimeoutMillis: 10000,
                        idleTimeoutMillis: 30000,
                        keepAlive: true,
                        keepAliveInitialDelayMillis: 10000,
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                useFactory: (config) => ({
                    throttlers: [{
                            ttl: config.get('THROTTLE_TTL', 60) * 1000,
                            limit: config.get('THROTTLE_LIMIT', 20),
                        }],
                }),
                inject: [config_1.ConfigService],
            }),
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            email_module_1.EmailModule,
            credits_module_1.CreditsModule,
            analyze_module_1.AnalyzeModule,
            history_module_1.HistoryModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map