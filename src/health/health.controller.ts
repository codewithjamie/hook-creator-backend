import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() };
  }

  @Get('tools')
  @ApiOperation({ summary: 'Verify system tools (yt-dlp, ffmpeg, node, JS runtime)' })
  async checkTools() {
    const [ffmpeg, ytDlp] = await Promise.all([
      this.checkTool('ffmpeg -version'),
      this.checkTool('yt-dlp --version'),
    ]);
    return {
      node: { ok: true, version: process.version },
      runtime: { ok: true, platform: process.platform, arch: process.arch },
      ffmpeg,
      ytDlp,
    };
  }

  private async checkTool(cmd: string) {
    try {
      const { stdout } = await execAsync(cmd);
      return { ok: true, version: stdout.split('\n')[0].trim() };
    } catch {
      return { ok: false, error: `Not found — install in PATH` };
    }
  }
}
