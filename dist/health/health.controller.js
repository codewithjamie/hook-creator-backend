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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let HealthController = class HealthController {
    check() {
        return { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() };
    }
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
    async checkTool(cmd) {
        try {
            const { stdout } = await execAsync(cmd);
            return { ok: true, version: stdout.split('\n')[0].trim() };
        }
        catch {
            return { ok: false, error: `Not found — install in PATH` };
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Health check' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('tools'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify system tools (yt-dlp, ffmpeg, node, JS runtime)' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "checkTools", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('health'),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('health')
], HealthController);
//# sourceMappingURL=health.controller.js.map