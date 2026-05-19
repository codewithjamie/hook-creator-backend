"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HookValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookValidationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let HookValidationService = HookValidationService_1 = class HookValidationService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(HookValidationService_1.name);
        this.minDuration = config.get('DEFAULT_HOOK_MIN_DURATION', 6);
        this.maxDuration = config.get('DEFAULT_HOOK_MAX_DURATION', 12);
    }
    validate(hooks, minDur, maxDur, videoDur) {
        const min = minDur ?? this.minDuration;
        const max = maxDur ?? this.maxDuration;
        const valid = [];
        const rejected = [];
        for (const hook of hooks) {
            const reason = this.rejectReason(hook, min, max, videoDur);
            if (reason) {
                rejected.push({ hook, reason });
                this.logger.warn(`Hook rank=${hook.rank} [${hook.startTime}s→${hook.endTime}s] ` +
                    `rejected: ${reason}`);
            }
            else {
                valid.push(hook);
            }
        }
        const deduped = this.removeOverlaps(valid);
        const sorted = deduped
            .sort((a, b) => b.hookScore - a.hookScore)
            .map((h, i) => ({ ...h, rank: i + 1 }));
        this.logger.log(`Hook validation: ${hooks.length} input → ` +
            `${sorted.length} valid, ${rejected.length} rejected`);
        return { valid: sorted, rejected };
    }
    assertHasValid(result) {
        if (result.valid.length === 0) {
            const reasons = result.rejected.map((r) => r.reason).join('; ');
            throw new common_1.UnprocessableEntityException(`All ${result.rejected.length} hooks failed validation: ${reasons}. ` +
                `Check that the video has sufficient speakable content.`);
        }
    }
    rejectReason(hook, min, max, videoDur) {
        if (hook.startTime == null || hook.endTime == null) {
            return 'Missing startTime or endTime';
        }
        if (!hook.bridgeSentence?.trim()) {
            return 'Missing bridgeSentence';
        }
        if (!hook.whySelected?.trim()) {
            return 'Missing whySelected';
        }
        if (isNaN(hook.startTime) || isNaN(hook.endTime)) {
            return 'startTime or endTime is NaN';
        }
        if (hook.startTime < 0) {
            return `Negative startTime (${hook.startTime})`;
        }
        if (hook.endTime <= hook.startTime) {
            return `endTime (${hook.endTime}) must be > startTime (${hook.startTime})`;
        }
        const duration = hook.endTime - hook.startTime;
        if (duration < min) {
            return `Duration ${duration.toFixed(2)}s < min ${min}s`;
        }
        if (duration > max) {
            return `Duration ${duration.toFixed(2)}s > max ${max}s`;
        }
        if (videoDur !== undefined) {
            if (hook.startTime > videoDur) {
                return `startTime ${hook.startTime}s exceeds video duration ${videoDur}s`;
            }
            if (hook.endTime > videoDur + 0.5) {
                return `endTime ${hook.endTime}s exceeds video duration ${videoDur}s`;
            }
        }
        if (hook.hookScore < 0 || hook.hookScore > 100) {
            return `hookScore ${hook.hookScore} out of range [0, 100]`;
        }
        return null;
    }
    removeOverlaps(hooks) {
        if (hooks.length <= 1)
            return hooks;
        const sorted = [...hooks].sort((a, b) => a.startTime - b.startTime);
        const kept = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i];
            const last = kept[kept.length - 1];
            if (current.startTime >= last.endTime) {
                kept.push(current);
            }
            else {
                if (current.hookScore > last.hookScore) {
                    this.logger.debug(`Overlap: replacing rank=${last.rank} (score=${last.hookScore}) ` +
                        `with rank=${current.rank} (score=${current.hookScore})`);
                    kept[kept.length - 1] = current;
                }
                else {
                    this.logger.debug(`Overlap: keeping rank=${last.rank} over rank=${current.rank}`);
                }
            }
        }
        return kept;
    }
};
exports.HookValidationService = HookValidationService;
exports.HookValidationService = HookValidationService = HookValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], HookValidationService);
//# sourceMappingURL=hook-validation.service.js.map