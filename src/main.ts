import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true, // Required for Stripe webhook signature verification
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const isDev = config.get('NODE_ENV') !== 'production';

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.enableCors({
    origin: config.get<string>('ALLOWED_ORIGINS', '*'),
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger ────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
  .setTitle('OpenEdge API')
  .setDescription('Video hook analysis — extract viral hooks, create crossfade clips, manage credits')
  .setVersion('2.0')
  .addBearerAuth()  
  .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🎬 OpenEdge API  → http://localhost:${port}`);
  logger.log(`📖 Swagger docs → http://localhost:${port}/docs`);
  logger.log(`🗄️  Database    → Supabase PostgreSQL`);

  function maskKey(value: string | undefined): string {
    if (!value) return '❌ Missing';
    return `✅ Set (${value.slice(0, 8)}...)`;
  }

  // then in bootstrap():
  logger.log('=== Configuration Check ===');
  logger.log(`OpenAI API Key:    ${maskKey(config.get<string>('OPENAI_API_KEY'))}`);
  logger.log(`Anthropic API Key: ${maskKey(config.get<string>('ANTHROPIC_API_KEY'))}`);
  logger.log(`Cloudinary:        ${maskKey(config.get<string>('CLOUDINARY_CLOUD_NAME'))}`);
  logger.log(`Stripe:            ${maskKey(config.get<string>('STRIPE_SECRET_KEY'))}`);
  logger.log(`Email (Resend):    ${maskKey(config.get<string>('RESEND_API_KEY'))}`);
  logger.log('===========================');
}

bootstrap();
