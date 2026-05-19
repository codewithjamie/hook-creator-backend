import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AnalyzeController } from './analyze.controller';
import { AnalyzeService } from './analyze.service';
import { AnalysisEntity } from './entities/analysis.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreditsModule } from '../credits/credits.module';
import { PlatformService } from './platform.service';
import { VideoDownloaderService } from './video-downloader.service';
import { FfmpegService } from './ffmpeg.service';
import { CloudinaryService } from './cloudinary.service';
import { TranscriptService } from './transcript.service';
import { HookScoringService } from './hook-scoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalysisEntity, UserEntity]),
    MulterModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const dir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
        fs.mkdirSync(dir, { recursive: true });
        return {
          storage: diskStorage({
            destination: (_req, _file, cb) => cb(null, dir),
            filename: (_req, file, cb) =>
              cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
          }),
          limits: {
            fileSize: config.get<number>('MAX_FILE_SIZE_MB', 500) * 1024 * 1024,
          },
          fileFilter: (_req, file, cb) => {
            const allowed = /\.(mp4|mov|avi|mkv|webm|mpeg|3gp)$/i;
            if (allowed.test(file.originalname)) cb(null, true);
            else cb(new Error('Only video files are allowed'), false);
          },
        };
      },
      inject: [ConfigService],
    }),
    CreditsModule,
  ],
  controllers: [AnalyzeController],
  providers: [
    AnalyzeService,
    PlatformService,
    VideoDownloaderService,
    FfmpegService,
    CloudinaryService,
    TranscriptService,
    HookScoringService,
  ],
  exports: [AnalyzeService],
})
export class AnalyzeModule {}