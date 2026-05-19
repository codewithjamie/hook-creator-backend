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
var FfmpegService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FfmpegService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const uuid_1 = require("uuid");
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const mkdirAsync = (0, util_1.promisify)(fs.mkdir);
const unlinkAsync = (0, util_1.promisify)(fs.unlink);
const existsAsync = (0, util_1.promisify)(fs.exists);
let FfmpegService = FfmpegService_1 = class FfmpegService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(FfmpegService_1.name);
        this.uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
        this.ffmpegPath = config.get('FFMPEG_PATH', '') || ffmpegStatic;
        this.ffprobePath =
            config.get('FFPROBE_PATH', '') || ffprobeStatic.path;
        this.ensureUploadDir();
    }
    async probe(filePath) {
        this.logger.debug(`Probing: ${filePath}`);
        const raw = await this.runCommand(this.ffprobePath, [
            '-v',
            'quiet',
            '-print_format',
            'json',
            '-show_streams',
            '-show_format',
            filePath,
        ]);
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            throw new common_1.InternalServerErrorException(`ffprobe returned invalid JSON for: ${filePath}`);
        }
        const streams = parsed['streams'] ?? [];
        const format = parsed['format'] ?? {};
        const videoStream = streams.find((s) => s['codec_type'] === 'video') ?? {};
        const audioStream = streams.find((s) => s['codec_type'] === 'audio');
        const durationRaw = format['duration'] ??
            videoStream['duration'] ??
            '0';
        const durationSeconds = parseFloat(durationRaw);
        const fpsRaw = videoStream['r_frame_rate'] ?? '30/1';
        const [fpsNum, fpsDen] = fpsRaw.split('/').map(Number);
        const fps = fpsDen > 0 ? fpsNum / fpsDen : 30;
        return {
            durationSeconds,
            width: parseInt(videoStream['width'] ?? '0', 10),
            height: parseInt(videoStream['height'] ?? '0', 10),
            fps,
            hasAudio: audioStream !== undefined,
        };
    }
    async extractClip(sourcePath, startTime, endTime) {
        const duration = endTime - startTime;
        const outputPath = this.tempPath(`hook-${(0, uuid_1.v4)()}.mp4`);
        this.logger.log(`Extracting clip [${startTime}s → ${endTime}s] (${duration.toFixed(2)}s)`);
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-ss',
            String(startTime),
            '-i',
            sourcePath,
            '-t',
            String(duration),
            '-c:v',
            'libx264',
            '-preset',
            'fast',
            '-crf',
            '23',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-movflags',
            '+faststart',
            outputPath,
        ]);
        return outputPath;
    }
    async mergeWithCrossfade(hookPath, fullVideoPath) {
        const outputPath = this.tempPath(`merged-${(0, uuid_1.v4)()}.mp4`);
        const hookProbe = await this.probe(hookPath);
        const hookDuration = hookProbe.durationSeconds;
        if (hookDuration < 1) {
            throw new common_1.InternalServerErrorException(`Hook clip is too short (${hookDuration.toFixed(2)}s) to apply crossfade.`);
        }
        const crossfadeDuration = 0.5;
        const xfadeOffset = Math.max(0, hookDuration - crossfadeDuration);
        this.logger.log(`Crossfade merge: hook=${hookDuration.toFixed(3)}s, ` +
            `xfadeOffset=${xfadeOffset.toFixed(3)}s, ` +
            `crossfadeDuration=${crossfadeDuration}s`);
        const filterComplex = [
            `[0:v][1:v]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${xfadeOffset}[v]`,
            `[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[a]`,
        ].join(';');
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-i',
            hookPath,
            '-i',
            fullVideoPath,
            '-filter_complex',
            filterComplex,
            '-map',
            '[v]',
            '-map',
            '[a]',
            '-c:v',
            'libx264',
            '-preset',
            'medium',
            '-crf',
            '23',
            '-profile:v',
            'high',
            '-level',
            '4.1',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-movflags',
            '+faststart',
            outputPath,
        ]);
        this.logger.log(`Crossfade merge complete → ${outputPath}`);
        return outputPath;
    }
    async ensureAudioTrack(sourcePath) {
        const probe = await this.probe(sourcePath);
        if (probe.hasAudio)
            return sourcePath;
        this.logger.warn(`Video has no audio track — adding silent audio: ${sourcePath}`);
        const outputPath = this.tempPath(`audio-padded-${(0, uuid_1.v4)()}.mp4`);
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-i',
            sourcePath,
            '-f',
            'lavfi',
            '-i',
            `aevalsrc=0:c=stereo:r=44100:d=${probe.durationSeconds}`,
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-shortest',
            outputPath,
        ]);
        return outputPath;
    }
    async cleanup(...filePaths) {
        await Promise.allSettled(filePaths
            .filter((p) => typeof p === 'string')
            .map(async (p) => {
            try {
                if (await existsAsync(p))
                    await unlinkAsync(p);
            }
            catch (err) {
                this.logger.warn(`Failed to delete temp file ${p}: ${String(err)}`);
            }
        }));
    }
    tempPath(filename) {
        return path.join(this.uploadDir, filename);
    }
    async ensureUploadDir() {
        await mkdirAsync(this.uploadDir, { recursive: true }).catch(() => {
        });
    }
    runCommand(binary, args, options) {
        return new Promise((resolve, reject) => {
            const cmd = (0, child_process_1.spawn)(binary, args, {
                ...options,
                env: { ...process.env },
            });
            const stdoutChunks = [];
            const stderrChunks = [];
            cmd.stdout?.on('data', (chunk) => stdoutChunks.push(chunk));
            cmd.stderr?.on('data', (chunk) => stderrChunks.push(chunk));
            cmd.on('error', (err) => {
                reject(new common_1.InternalServerErrorException(`Failed to spawn ${path.basename(binary)}: ${err.message}`));
            });
            cmd.on('close', (code) => {
                const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
                const stderr = Buffer.concat(stderrChunks).toString('utf-8');
                if (code === 0) {
                    resolve(stdout);
                }
                else {
                    const stderrTail = stderr.split('\n').slice(-3).join('\n').trim();
                    this.logger.error(`${path.basename(binary)} exited ${code}: ${stderrTail}`);
                    reject(new common_1.InternalServerErrorException(`FFmpeg error (exit ${code}): ${stderrTail}`));
                }
            });
        });
    }
};
exports.FfmpegService = FfmpegService;
exports.FfmpegService = FfmpegService = FfmpegService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FfmpegService);
//# sourceMappingURL=ffmpeg.service.js.map