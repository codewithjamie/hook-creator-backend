import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AnalyzeUrlDto {
  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsString()
  video_url: string;

  @ApiPropertyOptional({ example: 6, minimum: 3, maximum: 30 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(30)
  @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
  min_hook_duration?: number;

  @ApiPropertyOptional({ example: 12, minimum: 5, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
  max_hook_duration?: number;

  @ApiPropertyOptional({ enum: ['auto', 'youtube_captions', 'whisper'] })
  @IsOptional()
  @IsEnum(['auto', 'youtube_captions', 'whisper'])
  transcript_source?: 'auto' | 'youtube_captions' | 'whisper';
}

export class RebuildDto {
  @ApiProperty({ description: 'Analysis ID from a previous /analyze call' })
  @IsUUID()
  analysisId: string;

  @ApiPropertyOptional({ description: 'Hook rank to use (1–6), default is 1 (best)', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  hookRank?: number;
}

export class ExtractClipDto {
  @ApiProperty({ description: 'Analysis ID to extract a clip from' })
  @IsUUID()
  analysisId: string;

  @ApiProperty({ example: 42.5 })
  @IsNumber()
  startTime: number;

  @ApiProperty({ example: 51.2 })
  @IsNumber()
  endTime: number;
}

export class DetectPlatformResponse {
  @ApiProperty({ example: 'youtube', enum: ['youtube', 'rumble', 'google_drive', 'generic'] })
  platform: string;

  @ApiProperty({ example: true })
  supported: boolean;

  @ApiPropertyOptional({ example: 'dQw4w9WgXcQ' })
  videoId?: string;
}

export class HookDto {
  @ApiProperty() rank: number;
  @ApiProperty() startTime: number;
  @ApiProperty() endTime: number;
  @ApiProperty() bridgeSentence: string;
  @ApiProperty() whySelected: string;
  @ApiProperty() hookScore: number;
  @ApiProperty() startSentence: string;
  @ApiProperty() endSentence: string;
  @ApiPropertyOptional() clip: { url: string } | null;
}

export class AnalysisResponse {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['pending', 'processing', 'complete', 'failed'] }) status: string;
  @ApiPropertyOptional() clipUrl: string | null;
  @ApiPropertyOptional() startTime: number | null;
  @ApiPropertyOptional() endTime: number | null;
  @ApiPropertyOptional() bridgeSentence: string | null;
  @ApiPropertyOptional() whySelected: string | null;
  @ApiPropertyOptional() hookScore: number | null;
  @ApiPropertyOptional({ enum: ['youtube_captions', 'whisper'] }) transcriptSource: string | null;
  @ApiPropertyOptional({ type: [HookDto] }) fullHooks: HookDto[] | null;
  @ApiProperty() creditsUsed: number;
  @ApiProperty() creditsRemaining: number;
  @ApiPropertyOptional() videoTitle: string | null;
  @ApiPropertyOptional() videoDurationSeconds: number | null;
  @ApiProperty({ enum: ['youtube', 'rumble', 'google_drive', 'upload'] }) platform: string;
  @ApiPropertyOptional() sourceUrl: string | null;
  @ApiPropertyOptional() errorMessage: string | null;
  @ApiProperty() createdAt: Date;
}
export class HookOnlyDto {
  @ApiProperty({ example: 'https://www.youtube.com/watch?v=abc123' })
  @IsString()
  video_url: string;

  @ApiPropertyOptional({ example: 6, minimum: 3, maximum: 30 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(30)
  @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
  min_hook_duration?: number;

  @ApiPropertyOptional({ example: 12, minimum: 5, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  @Transform(({ value }) => value !== undefined ? Number(value) : undefined)
  max_hook_duration?: number;

  @ApiPropertyOptional({ enum: ['auto', 'youtube_captions', 'whisper'] })
  @IsOptional()
  @IsEnum(['auto', 'youtube_captions', 'whisper'])
  transcript_source?: 'auto' | 'youtube_captions' | 'whisper';
}

export class MergeHookDto {
  @ApiProperty({ description: 'Analysis ID from a hook-only result' })
  analysisId: string;

  @ApiProperty({ description: 'Hook rank to merge (1-6)', example: 1 })
  hookRank: number;
}
