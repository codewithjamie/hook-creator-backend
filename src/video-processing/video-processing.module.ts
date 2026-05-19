import { Module } from '@nestjs/common';
import { FfmpegService } from './ffmpeg.service';
import { CloudinaryService } from './cloudinary.service';
import { VideoService } from './video.service';

@Module({
  providers: [FfmpegService, CloudinaryService, VideoService],
  exports: [FfmpegService, CloudinaryService, VideoService],
})
export class VideoProcessingModule {}
