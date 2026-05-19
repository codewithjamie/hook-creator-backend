import { HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
export declare class HealthController {
    private readonly health;
    private readonly memory;
    private readonly disk;
    constructor(health: HealthCheckService, memory: MemoryHealthIndicator, disk: DiskHealthIndicator);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
}
