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
  @ApiProperty({ enum: ['youtube', 'rumble', 'google_drive', 'upload'] }) platform: string;
  @ApiProperty({ enum: ['pending', 'processing', 'complete', 'failed'] }) status: string;
  @ApiProperty() creditsUsed: number;
  @ApiProperty() createdAt: Date;
}

export class HistoryListResponse {
  @ApiProperty({ type: [HistoryItemResponse] }) items: HistoryItemResponse[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
