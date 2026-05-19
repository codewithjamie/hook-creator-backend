import { Module } from '@nestjs/common';
import { TranscriptService } from './transcript.service';
import { WhisperService } from './whisper.service';
import { HooksModule } from '../hooks/hooks.module';

@Module({
  imports: [HooksModule],
  providers: [TranscriptService, WhisperService],
  exports: [TranscriptService],
})
export class TranscriptModule {}
