import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const uploadDir = config.get<string>(
          'UPLOAD_DIR',
          '/tmp/openedge-uploads',
        );

        // Ensure directory exists at startup
        fs.mkdirSync(uploadDir, { recursive: true });

        return {
          storage: diskStorage({
            destination: (_req, _file, cb) => cb(null, uploadDir),
            filename: (_req, file, cb) => {
              const ext = path.extname(file.originalname).toLowerCase();
              cb(null, `multer-${uuidv4()}${ext}`);
            },
          }),
          limits: {
            fileSize:
              config.get<number>('MAX_FILE_SIZE_MB', 500) * 1024 * 1024,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [UploadService],
  exports: [UploadService, MulterModule],
})
export class UploadModule {}
