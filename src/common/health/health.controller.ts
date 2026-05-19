import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * GET /health — Railway / Render / ECS health check endpoint.
 * Skips rate limiting so probes never get throttled.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Heap must stay under 512 MB
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      // RSS must stay under 1 GB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
    ]);
  }
}
