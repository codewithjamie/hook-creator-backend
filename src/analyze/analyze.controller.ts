import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyzeService } from './analyze.service';
import {
  AnalyzeUrlDto,
  RebuildDto,
  ExtractClipDto,
  DetectPlatformResponse,
  AnalysisResponse,
  HookOnlyDto,
  MergeHookDto, 
} from './dto/analyze.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('analyze')
@Controller('analyze')
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Get('detect')
  @ApiOperation({ summary: 'Detect platform from URL (public)' })
  @ApiQuery({ name: 'url', example: 'https://www.youtube.com/watch?v=abc123' })
  @ApiResponse({ status: 200, type: DetectPlatformResponse })
  detect(@Query('url') url: string): DetectPlatformResponse {
    return this.analyzeService.detectPlatform(url);
  }

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @HttpCode(200)
  // @ApiOperation({ summary: 'Extract best hook clip — costs 1 credit' })
  // @ApiResponse({ status: 200, type: AnalysisResponse })
  // @ApiResponse({ status: 402, description: 'Insufficient credits' })
  // analyze(
  //   @Request() req: { user: { id: string } },
  //   @Body() dto: AnalyzeUrlDto,
  // ): Promise<AnalysisResponse> {
  //   return this.analyzeService.analyzeUrl(req.user.id, dto);
  // }

  // @Post('upload')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @UseInterceptors(FileInterceptor('videoFile'))
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     required: ['videoFile'],
  //     properties: {
  //       videoFile: { type: 'string', format: 'binary', description: 'MP4, MOV, AVI, MKV, WEBM' },
  //       min_hook_duration: { type: 'number', example: 6 },
  //       max_hook_duration: { type: 'number', example: 12 },
  //       transcript_source: { type: 'string', enum: ['auto', 'youtube_captions', 'whisper'] },
  //     },
  //   },
  // })
  // @ApiOperation({ summary: 'Upload a video file and extract best hook — costs 3 credits' })
  // @ApiResponse({ status: 200, type: AnalysisResponse })
  // @ApiResponse({ status: 402, description: 'Insufficient credits' })
  // uploadAnalyze(
  //   @Request() req: { user: { id: string } },
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body() body: Record<string, string>,
  // ): Promise<AnalysisResponse> {
  //   return this.analyzeService.analyzeUpload(req.user.id, file, body);
  // }

  // @Post('rebuild')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Rebuild video with a different hook — costs 1 credit' })
  // @ApiResponse({ status: 200, type: AnalysisResponse })
  // @ApiResponse({ status: 402, description: 'Insufficient credits' })
  // rebuild(
  //   @Request() req: { user: { id: string } },
  //   @Body() dto: RebuildDto,
  // ): Promise<AnalysisResponse> {
  //   return this.analyzeService.rebuild(req.user.id, dto);
  // }

  // @Post('clip')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Extract a specific clip on demand — costs 1 credit' })
  // @ApiResponse({ status: 200, type: AnalysisResponse })
  // @ApiResponse({ status: 402, description: 'Insufficient credits' })
  // extractClip(
  //   @Request() req: { user: { id: string } },
  //   @Body() dto: ExtractClipDto,
  // ): Promise<AnalysisResponse> {
  //   return this.analyzeService.extractClip(req.user.id, dto);
  // }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Extract best hook clip — costs 1 credit' })
  @ApiResponse({ status: 200, type: AnalysisResponse })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  analyze(
    @Request() req: { user: { id: string; email: string } },
    @Body() dto: AnalyzeUrlDto,
  ): Promise<AnalysisResponse> {
    return this.analyzeService.analyzeUrl(req.user.id, req.user.email, dto);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('videoFile'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['videoFile'],
      properties: {
        videoFile: { type: 'string', format: 'binary' },
        min_hook_duration: { type: 'number', example: 6 },
        max_hook_duration: { type: 'number', example: 12 },
        transcript_source: { type: 'string', enum: ['auto', 'youtube_captions', 'whisper'] },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a video file and extract best hook — costs 3 credits' })
  @ApiResponse({ status: 200, type: AnalysisResponse })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  uploadAnalyze(
    @Request() req: { user: { id: string; email: string } },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ): Promise<AnalysisResponse> {
    return this.analyzeService.analyzeUpload(req.user.id, req.user.email, file, body);
  }

  @Post('hook-only')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Extract hook clips only — no merge with full video — costs 1 credit' })
  @ApiResponse({ status: 200, type: AnalysisResponse })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  hookOnly(
    @Request() req: { user: { id: string; email: string } },
    @Body() dto: HookOnlyDto,
  ): Promise<AnalysisResponse> {
    return this.analyzeService.hookOnly(req.user.id, req.user.email, dto);
  }

  @Post('rebuild')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rebuild video with a different hook — costs 3 credits' })
  @ApiResponse({ status: 200, type: AnalysisResponse })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  rebuild(
    @Request() req: { user: { id: string; email: string } },
    @Body() dto: RebuildDto,
  ): Promise<AnalysisResponse> {
    return this.analyzeService.rebuild(req.user.id, req.user.email, dto);
  }

  @Post('clip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extract a specific clip on demand — costs 1 credit' })
  @ApiResponse({ status: 200, type: AnalysisResponse })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  extractClip(
    @Request() req: { user: { id: string; email: string } },
    @Body() dto: ExtractClipDto,
  ): Promise<AnalysisResponse> {
    return this.analyzeService.extractClip(req.user.id, req.user.email, dto);
  }

  @Post('merge-hook')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Merge a selected hook with its original full video — costs 3 credits',
    description: 'Takes a hook-only analysis result and merges the chosen hook clip with the original video download.',
  })
  @ApiResponse({ status: 200, type: AnalysisResponse })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  mergeHook(
    @Request() req: { user: { id: string; email: string } },
    @Body() dto: MergeHookDto,
  ): Promise<AnalysisResponse> {
    return this.analyzeService.mergeHook(req.user.id, req.user.email, dto);
  }
}
