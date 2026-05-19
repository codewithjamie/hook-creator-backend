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
const child_process_1 = require("child_process");
const path = require("path");
const fs = require("fs");
const uuid_1 = require("uuid");
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const TRANSITION_SOUND_PATH = path.join(process.cwd(), 'assets', 'transition.mp3');
let FfmpegService = FfmpegService_1 = class FfmpegService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(FfmpegService_1.name);
        this.uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
        this.ffmpegPath = config.get('FFMPEG_PATH', '') || ffmpegStatic;
        this.ffprobePath = config.get('FFPROBE_PATH', '') || ffprobeStatic.path;
    }
    async getDuration(filePath) {
        const raw = await this.runCommand(this.ffprobePath, [
            '-v', 'quiet', '-print_format', 'json',
            '-show_format', filePath,
        ]);
        const data = JSON.parse(raw);
        return parseFloat(data.format.duration ?? '0');
    }
    async extractClip(sourcePath, startTime, endTime) {
        const duration = endTime - startTime;
        const outputPath = path.join(this.uploadDir, `clip-${(0, uuid_1.v4)()}.mp4`);
        this.logger.log(`Extracting clip [${startTime}s → ${endTime}s] duration=${duration.toFixed(2)}s`);
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-ss', String(startTime),
            '-i', sourcePath,
            '-t', String(duration),
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart',
            outputPath,
        ]);
        return outputPath;
    }
    async mergeWithCrossfade(hookPath, fullVideoPath) {
        const outputPath = path.join(this.uploadDir, `merged-${(0, uuid_1.v4)()}.mp4`);
        const hookDuration = await this.getDuration(hookPath);
        const crossfadeDuration = 0.5;
        const xfadeOffset = Math.max(0, hookDuration - crossfadeDuration);
        const flashStartTime = Math.max(0, hookDuration - 0.1);
        const soundStartMs = Math.max(0, Math.round(flashStartTime * 1000));
        this.logger.log(`Crossfade merge | hookDuration=${hookDuration.toFixed(3)}s | soundAt=${(soundStartMs / 1000).toFixed(3)}s | flashAt=${flashStartTime.toFixed(3)}s`);
        if (!require('fs').existsSync(TRANSITION_SOUND_PATH)) {
            this.logger.warn(`Transition sound not found at ${TRANSITION_SOUND_PATH} — merging without sound`);
            return this.mergeWithCrossfadeNoSound(hookPath, fullVideoPath, outputPath, hookDuration, xfadeOffset, flashStartTime);
        }
        const flashedHookPath = path.join(this.uploadDir, `flashed-${(0, uuid_1.v4)()}.mp4`);
        this.logger.log(`Transition sound found at ${TRANSITION_SOUND_PATH}`);
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-i', hookPath,
            '-i', TRANSITION_SOUND_PATH,
            '-filter_complex',
            [
                `[0:v]curves=` +
                    `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
                    `:all='0/0 0.3/1 1/1'[vflash]`,
                `[1:a]adelay=${soundStartMs}|${soundStartMs}[sounddelayed]`,
                `[0:a][sounddelayed]amix=inputs=2:duration=first:weights=1 1.5[amixed]`,
            ].join(';'),
            '-map', '[vflash]',
            '-map', '[amixed]',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '192k',
            flashedHookPath,
        ]);
        this.logger.log(`Flash + transition sound applied → ${flashedHookPath}`);
        const flashedDuration = await this.getDuration(flashedHookPath);
        const finalOffset = Math.max(0, flashedDuration - crossfadeDuration);
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-i', flashedHookPath,
            '-i', fullVideoPath,
            '-filter_complex',
            [
                `[0:v][1:v]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${finalOffset.toFixed(3)}[vout]`,
                `[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[aout]`,
            ].join(';'),
            '-map', '[vout]',
            '-map', '[aout]',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
            '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart',
            outputPath,
        ]);
        this.cleanup(flashedHookPath);
        this.logger.log(`Crossfade merge complete → ${outputPath}`);
        return outputPath;
    }
    async mergeWithCrossfadeNoSound(hookPath, fullVideoPath, outputPath, hookDuration, xfadeOffset, flashStartTime) {
        const flashedHookPath = path.join(this.uploadDir, `flashed-${(0, uuid_1.v4)()}.mp4`);
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-i', hookPath,
            '-filter_complex',
            `[0:v]curves=` +
                `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
                `:all='0/0 0.3/1 1/1'[vflash]`,
            '-map', '[vflash]',
            '-map', '0:a',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '192k',
            flashedHookPath,
        ]);
        const flashedDuration = await this.getDuration(flashedHookPath);
        const finalOffset = Math.max(0, flashedDuration - 0.5);
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-i', flashedHookPath,
            '-i', fullVideoPath,
            '-filter_complex',
            [
                `[0:v][1:v]xfade=transition=dissolve:duration=0.5:offset=${finalOffset.toFixed(3)}[vout]`,
                `[0:a][1:a]acrossfade=d=0.5:c1=exp:c2=exp[aout]`,
            ].join(';'),
            '-map', '[vout]',
            '-map', '[aout]',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
            '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart',
            outputPath,
        ]);
        this.cleanup(flashedHookPath);
        return outputPath;
    }
    async extractAudioMp3(videoPath) {
        const outputPath = path.join(this.uploadDir, `audio-${(0, uuid_1.v4)()}.mp3`);
        await this.runCommand(this.ffmpegPath, [
            '-y', '-i', videoPath,
            '-vn', '-ar', '16000', '-ac', '1', '-b:a', '64k',
            outputPath,
        ]);
        return outputPath;
    }
    cleanup(...paths) {
        for (const p of paths) {
            try {
                if (fs.existsSync(p))
                    fs.unlinkSync(p);
            }
            catch { }
        }
    }
    async extractHookOnly(hookPath) {
        const outputPath = path.join(this.uploadDir, `hook-only-${(0, uuid_1.v4)()}.mp4`);
        const hookDuration = await this.getDuration(hookPath);
        const flashStartTime = Math.max(0, hookDuration - 0.1);
        const soundStartMs = Math.max(0, Math.round(flashStartTime * 1000));
        this.logger.log(`Extracting hook-only clip | duration=${hookDuration.toFixed(3)}s`);
        const fs = require('fs');
        if (!fs.existsSync(TRANSITION_SOUND_PATH)) {
            await this.runCommand(this.ffmpegPath, [
                '-y',
                '-i', hookPath,
                '-filter_complex',
                `[0:v]curves=` +
                    `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
                    `:all='0/0 0.3/1 1/1'[vflash]`,
                '-map', '[vflash]',
                '-map', '0:a',
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                '-c:a', 'aac', '-b:a', '192k',
                '-movflags', '+faststart',
                outputPath,
            ]);
            return outputPath;
        }
        await this.runCommand(this.ffmpegPath, [
            '-y',
            '-i', hookPath,
            '-i', TRANSITION_SOUND_PATH,
            '-filter_complex',
            [
                `[0:v]curves=` +
                    `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
                    `:all='0/0 0.3/1 1/1'[vflash]`,
                `[1:a]adelay=${soundStartMs}|${soundStartMs}[sounddelayed]`,
                `[0:a][sounddelayed]amix=inputs=2:duration=first:weights=1 0.8[amixed]`,
            ].join(';'),
            '-map', '[vflash]',
            '-map', '[amixed]',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart',
            outputPath,
        ]);
        this.logger.log(`Hook-only clip ready → ${outputPath}`);
        return outputPath;
    }
    runCommand(binary, args) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)(binary, args);
            const out = [];
            const err = [];
            proc.stdout?.on('data', (d) => out.push(d));
            proc.stderr?.on('data', (d) => err.push(d));
            proc.on('close', (code) => {
                if (code === 0)
                    return resolve(Buffer.concat(out).toString());
                const msg = Buffer.concat(err).toString().split('\n').slice(-3).join('\n');
                reject(new common_1.InternalServerErrorException(`FFmpeg error: ${msg}`));
            });
            proc.on('error', (e) => reject(new common_1.InternalServerErrorException(`FFmpeg spawn error: ${e.message}`)));
        });
    }
};
exports.FfmpegService = FfmpegService;
exports.FfmpegService = FfmpegService = FfmpegService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FfmpegService);
//# sourceMappingURL=ffmpeg.service.js.map