import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ParsedHook } from '../common/dto/analyze.dto';

export interface ValidationResult {
  valid: ParsedHook[];
  rejected: Array<{ hook: ParsedHook; reason: string }>;
}

/**
 * Port of openedge_utils.py → validate_hooks()
 *
 * Applies business rules to filter and rank Claude's hook suggestions:
 *  - Duration bounds
 *  - Required field presence
 *  - Non-overlapping time ranges
 *  - Score sanity
 *  - Re-ranks survivors by hookScore descending
 */
@Injectable()
export class HookValidationService {
  private readonly logger = new Logger(HookValidationService.name);
  private readonly minDuration: number;
  private readonly maxDuration: number;

  constructor(private readonly config: ConfigService) {
    this.minDuration = config.get<number>('DEFAULT_HOOK_MIN_DURATION', 6);
    this.maxDuration = config.get<number>('DEFAULT_HOOK_MAX_DURATION', 12);
  }

  /**
   * Validate and filter a list of parsed hooks.
   *
   * @param hooks     Raw hooks from Claude
   * @param minDur    Minimum duration override (falls back to config)
   * @param maxDur    Maximum duration override (falls back to config)
   * @param videoDur  Total video duration in seconds (used for bounds check)
   */
  validate(
    hooks: ParsedHook[],
    minDur?: number,
    maxDur?: number,
    videoDur?: number,
  ): ValidationResult {
    const min = minDur ?? this.minDuration;
    const max = maxDur ?? this.maxDuration;

    const valid: ParsedHook[] = [];
    const rejected: Array<{ hook: ParsedHook; reason: string }> = [];

    for (const hook of hooks) {
      const reason = this.rejectReason(hook, min, max, videoDur);
      if (reason) {
        rejected.push({ hook, reason });
        this.logger.warn(
          `Hook rank=${hook.rank} [${hook.startTime}s→${hook.endTime}s] ` +
            `rejected: ${reason}`,
        );
      } else {
        valid.push(hook);
      }
    }

    // Remove overlapping hooks (keep highest score among overlapping group)
    const deduped = this.removeOverlaps(valid);

    // Re-sort by hookScore descending and re-number ranks
    const sorted = deduped
      .sort((a, b) => b.hookScore - a.hookScore)
      .map((h, i) => ({ ...h, rank: i + 1 }));

    this.logger.log(
      `Hook validation: ${hooks.length} input → ` +
        `${sorted.length} valid, ${rejected.length} rejected`,
    );

    return { valid: sorted, rejected };
  }

  /**
   * Throws if no valid hooks remain after validation.
   * Call after validate() to surface a clean error to the client.
   */
  assertHasValid(result: ValidationResult): void {
    if (result.valid.length === 0) {
      const reasons = result.rejected.map((r) => r.reason).join('; ');
      throw new UnprocessableEntityException(
        `All ${result.rejected.length} hooks failed validation: ${reasons}. ` +
          `Check that the video has sufficient speakable content.`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Private Helpers (mirroring openedge_utils.py logic)
  // ─────────────────────────────────────────────────────────────────────────

  private rejectReason(
    hook: ParsedHook,
    min: number,
    max: number,
    videoDur?: number,
  ): string | null {
    // Required field check
    if (hook.startTime == null || hook.endTime == null) {
      return 'Missing startTime or endTime';
    }
    if (!hook.bridgeSentence?.trim()) {
      return 'Missing bridgeSentence';
    }
    if (!hook.whySelected?.trim()) {
      return 'Missing whySelected';
    }

    // Numeric sanity
    if (isNaN(hook.startTime) || isNaN(hook.endTime)) {
      return 'startTime or endTime is NaN';
    }
    if (hook.startTime < 0) {
      return `Negative startTime (${hook.startTime})`;
    }
    if (hook.endTime <= hook.startTime) {
      return `endTime (${hook.endTime}) must be > startTime (${hook.startTime})`;
    }

    // Duration bounds
    const duration = hook.endTime - hook.startTime;
    if (duration < min) {
      return `Duration ${duration.toFixed(2)}s < min ${min}s`;
    }
    if (duration > max) {
      return `Duration ${duration.toFixed(2)}s > max ${max}s`;
    }

    // Video bounds check
    if (videoDur !== undefined) {
      if (hook.startTime > videoDur) {
        return `startTime ${hook.startTime}s exceeds video duration ${videoDur}s`;
      }
      if (hook.endTime > videoDur + 0.5) {
        // Allow 0.5 s tolerance for floating point
        return `endTime ${hook.endTime}s exceeds video duration ${videoDur}s`;
      }
    }

    // Score sanity
    if (hook.hookScore < 0 || hook.hookScore > 100) {
      return `hookScore ${hook.hookScore} out of range [0, 100]`;
    }

    return null; // All good
  }

  /**
   * Given a list of valid hooks, remove overlapping ones.
   * When two hooks overlap, keep the one with the higher hookScore.
   * Implements an interval sweep.
   */
  private removeOverlaps(hooks: ParsedHook[]): ParsedHook[] {
    if (hooks.length <= 1) return hooks;

    // Sort by start time for sweep
    const sorted = [...hooks].sort((a, b) => a.startTime - b.startTime);
    const kept: ParsedHook[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = kept[kept.length - 1];

      if (current.startTime >= last.endTime) {
        // No overlap — keep both
        kept.push(current);
      } else {
        // Overlap detected — keep whichever has a higher score
        if (current.hookScore > last.hookScore) {
          this.logger.debug(
            `Overlap: replacing rank=${last.rank} (score=${last.hookScore}) ` +
              `with rank=${current.rank} (score=${current.hookScore})`,
          );
          kept[kept.length - 1] = current;
        } else {
          this.logger.debug(
            `Overlap: keeping rank=${last.rank} over rank=${current.rank}`,
          );
        }
      }
    }

    return kept;
  }
}
