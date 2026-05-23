import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HistoryItemResponse {
  @ApiProperty() id: string;
  @ApiPropertyOptional() sourceUrl: string | null;
  @ApiPropertyOptional() videoTitle: string | null;
  @ApiPropertyOptional() clipUrl: string | null;
  @ApiPropertyOptional() hookScore: number | null;
  @ApiPropertyOptional() startTime: number | null;
  @ApiPropertyOptional() endTime: number | null;
  @ApiPropertyOptional() bridgeSentence: string | null;

  @ApiProperty({ enum: ['youtube', 'rumble', 'google_drive', 'upload'] })
  platform: 'youtube' | 'rumble' | 'google_drive' | 'upload';

  @ApiProperty({ enum: ['pending', 'processing', 'complete', 'failed'] })
  status: 'pending' | 'processing' | 'complete' | 'failed';

  @ApiProperty() creditsUsed: number;
  @ApiProperty() createdAt: Date;

  @ApiPropertyOptional({ type: [Object], nullable: true })
  fullHooks?: any[] | null;

  @ApiPropertyOptional({ nullable: true })
  whySelected?: string | null;

  @ApiPropertyOptional({ nullable: true })
  videoDurationSeconds?: number | null;

  @ApiPropertyOptional({ nullable: true }) hookScoreLabel: string | null;
}

export class HistoryListResponse {
  @ApiProperty({ type: [HistoryItemResponse] }) items: HistoryItemResponse[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
