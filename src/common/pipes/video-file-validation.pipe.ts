import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/mpeg',
  'video/3gpp',
  'video/x-flv',
  'video/x-ms-wmv',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.mpeg',
  '.mpg',
  '.3gp',
  '.flv',
  '.wmv',
]);

/**
 * Validates that the uploaded file is a video by MIME type and extension.
 * Apply as: @UploadedFile(new VideoFileValidationPipe())
 */
@Injectable()
export class VideoFileValidationPipe implements PipeTransform {
  transform(
    file: Express.Multer.File | undefined,
    _metadata: ArgumentMetadata,
  ): Express.Multer.File | undefined {
    // File is optional — AnalyzeController checks at service level
    if (!file) return undefined;

    const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);

    const ext = '.' + (file.originalname.split('.').pop() ?? '').toLowerCase();
    const extOk = ALLOWED_EXTENSIONS.has(ext);

    if (!mimeOk && !extOk) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Only video files are accepted (mp4, mov, avi, mkv, webm, etc.)`,
      );
    }

    const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB ?? '500', 10);
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the ${maxMb} MB limit.`,
      );
    }

    return file;
  }
}
