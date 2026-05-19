import { Repository } from 'typeorm';
import { AnalysisEntity } from '../analyze/entities/analysis.entity';
import { HistoryItemResponse, HistoryListResponse } from './dto/history.dto';
export declare class HistoryService {
    private readonly analyses;
    constructor(analyses: Repository<AnalysisEntity>);
    findAll(userId: string, page: number, limit: number): Promise<HistoryListResponse>;
    findOne(userId: string, id: string): Promise<HistoryItemResponse>;
    remove(userId: string, id: string): Promise<void>;
    private toResponse;
}
