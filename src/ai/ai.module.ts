import { Module } from '@nestjs/common';
import { ClaudeService } from './claude.service';
import { PromptService } from './prompt.service';

@Module({
  providers: [ClaudeService, PromptService],
  exports: [ClaudeService, PromptService],
})
export class AiModule {}
