import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { HistoryService } from './history.service';
import { HistoryItemResponse, HistoryListResponse } from './dto/history.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all past analyses' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, type: HistoryListResponse })
  findAll(
    @Request() req: { user: { id: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<HistoryListResponse> {
    return this.historyService.findAll(req.user.id, Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single analysis result' })
  @ApiParam({ name: 'id', description: 'Analysis UUID' })
  @ApiResponse({ status: 200, type: HistoryItemResponse })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HistoryItemResponse> {
    return this.historyService.findOne(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an analysis' })
  @ApiParam({ name: 'id', description: 'Analysis UUID' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.historyService.remove(req.user.id, id);
  }
}
