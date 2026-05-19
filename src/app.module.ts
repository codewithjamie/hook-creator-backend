import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import * as Joi from 'joi';

import { UserEntity } from './users/entities/user.entity';
import { AnalysisEntity } from './analyze/entities/analysis.entity';
import { CreditTransactionEntity } from './credits/entities/credit-transaction.entity';

import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CreditsModule } from './credits/credits.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { HistoryModule } from './history/history.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),

        // Database
        DATABASE_URL: Joi.string().required(),

        // Auth
        JWT_SECRET: Joi.string().min(32).required(),

        // AI
        ANTHROPIC_API_KEY: Joi.string().required(),
        OPENAI_API_KEY: Joi.string().required(),

        // Cloudinary
        CLOUDINARY_CLOUD_NAME: Joi.string().required(),
        CLOUDINARY_API_KEY: Joi.string().required(),
        CLOUDINARY_API_SECRET: Joi.string().required(),

        // Stripe
        STRIPE_SECRET_KEY: Joi.string().required(),
        STRIPE_WEBHOOK_SECRET: Joi.string().required(),

        // Email
        RESEND_API_KEY: Joi.string().required(),
        EMAIL_FROM: Joi.string().default('OpenEdge <noreply@openegdeai.com>'),
        APP_URL: Joi.string().default('http://localhost:3000'),

        // Files
        MAX_FILE_SIZE_MB: Joi.number().default(500),
        UPLOAD_DIR: Joi.string().default('/tmp/openedge-uploads'),

        // Rate limiting
        THROTTLE_TTL: Joi.number().default(60),
        THROTTLE_LIMIT: Joi.number().default(20),
      }),
      validationOptions: { abortEarly: false },
    }),

    // ── Database (Supabase PostgreSQL via TypeORM) ───────────────────────────
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [UserEntity, AnalysisEntity, CreditTransactionEntity],
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: { rejectUnauthorized: false },
        extra: {
          max: 10,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,        // close idle connections after 30s
          keepAlive: true,                  // send TCP keepalive packets
          keepAliveInitialDelayMillis: 10000,
        },
      }),
      inject: [ConfigService],
    }),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 20),
        }],
      }),
      inject: [ConfigService],
    }),

    // ── Features ─────────────────────────────────────────────────────────────
    HealthModule,
    AuthModule,
    EmailModule,
    CreditsModule,
    AnalyzeModule,
    HistoryModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
