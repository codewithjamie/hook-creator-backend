import { HistoryService } from './history.service';
import { HistoryItemResponse, HistoryListResponse } from './dto/history.dto';
export declare class HistoryController {
    private readonly historyService;
    constructor(historyService: HistoryService);
    findAll(req: {
        user: {
            id: string;
        };
    }, page?: number, limit?: number): Promise<HistoryListResponse>;
    findOne(req: {
        user: {
            id: string;
        };
    }, id: string): Promise<HistoryItemResponse>;
    remove(req: {
        user: {
            id: string;
        };
    }, id: string): Promise<void>;
}
