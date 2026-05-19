"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
        rawBody: true,
    });
    const config = app.get(config_1.ConfigService);
    const port = config.get('PORT', 3000);
    const isDev = config.get('NODE_ENV') !== 'production';
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.enableCors({
        origin: config.get('ALLOWED_ORIGINS', '*'),
        methods: ['GET', 'POST', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('OpenEdge API')
        .setDescription('Video hook analysis — extract viral hooks, create crossfade clips, manage credits')
        .setVersion('2.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    });
    await app.listen(port);
    const logger = new common_1.Logger('Bootstrap');
    logger.log(`🎬 OpenEdge API  → http://localhost:${port}`);
    logger.log(`📖 Swagger docs → http://localhost:${port}/docs`);
    logger.log(`🗄️  Database    → Supabase PostgreSQL`);
    function maskKey(value) {
        if (!value)
            return '❌ Missing';
        return `✅ Set (${value.slice(0, 8)}...)`;
    }
    logger.log('=== Configuration Check ===');
    logger.log(`OpenAI API Key:    ${maskKey(config.get('OPENAI_API_KEY'))}`);
    logger.log(`Anthropic API Key: ${maskKey(config.get('ANTHROPIC_API_KEY'))}`);
    logger.log(`Cloudinary:        ${maskKey(config.get('CLOUDINARY_CLOUD_NAME'))}`);
    logger.log(`Stripe:            ${maskKey(config.get('STRIPE_SECRET_KEY'))}`);
    logger.log(`Email (Resend):    ${maskKey(config.get('RESEND_API_KEY'))}`);
    logger.log('===========================');
}
bootstrap();
//# sourceMappingURL=main.js.map