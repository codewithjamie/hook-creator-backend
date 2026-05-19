import { ConfigService } from '@nestjs/config';
import type { ParsedHook } from '../common/dto/analyze.dto';
export interface ValidationResult {
    valid: ParsedHook[];
    rejected: Array<{
        hook: ParsedHook;
        reason: string;
    }>;
}
export declare class HookValidationService {
    private readonly config;
    private readonly logger;
    private readonly minDuration;
    private readonly maxDuration;
    constructor(config: ConfigService);
    validate(hooks: ParsedHook[], minDur?: number, maxDur?: number, videoDur?: number): ValidationResult;
    assertHasValid(result: ValidationResult): void;
    private rejectReason;
    private removeOverlaps;
}
