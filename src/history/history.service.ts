import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisEntity } from '../analyze/entities/analysis.entity';
import {
  HistoryItemResponse,
  HistoryListResponse,
} from './dto/history.dto';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(AnalysisEntity)
    private readonly analyses: Repository<AnalysisEntity>,
  ) {}

  async findAll(
    userId: string,
    page: number,
    limit: number,
  ): Promise<HistoryListResponse> {
    const [items, total] = await this.analyses.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map(this.toResponse),
      total,
      page,
      limit,
    };
  }

  async findOne(userId: string, id: string): Promise<HistoryItemResponse> {
    const record = await this.analyses.findOne({ where: { id, userId } });
    if (!record) throw new NotFoundException(`Analysis ${id} not found`);
    return this.toResponse(record);
  }

  async remove(userId: string, id: string): Promise<void> {
    const record = await this.analyses.findOne({ where: { id, userId } });
    if (!record) throw new NotFoundException(`Analysis ${id} not found`);
    await this.analyses.remove(record);
  }

  private toResponse(record: AnalysisEntity): HistoryItemResponse {
    return {
      id: record.id,
      sourceUrl: record.sourceUrl,
      videoTitle: record.videoTitle,
      clipUrl: record.clipUrl,
      hookScore: record.hookScore,
      startTime: record.startTime,
      endTime: record.endTime,
      bridgeSentence: record.bridgeSentence,
      platform: record.platform,
      status: record.status,
      creditsUsed: record.creditsUsed,
      createdAt: record.createdAt,
      fullHooks: record.fullHooks ?? null,        // ← add this
      whySelected: record.whySelected ?? null,    // ← add this
      hookScoreLabel: record.hookScoreLabel ?? null, // ← add this if exists on entity
      videoDurationSeconds: record.videoDurationSeconds ?? null, // ← add this
    };
  }
}
