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
var WhisperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const openedge_utils_service_1 = require("../hooks/openedge-utils.service");
const WHISPER_MAX_BYTES = 24 * 1024 * 1024;
let WhisperService = WhisperService_1 = class WhisperService {
    constructor(config, utils) {
        this.config = config;
        this.utils = utils;
        this.logger = new common_1.Logger(WhisperService_1.name);
        this.openai = new openai_1.default({
            apiKey: config.getOrThrow('OPENAI_API_KEY'),
        });
        this.uploadDir = config.get('UPLOAD_DIR', '/tmp/openedge-uploads');
        this.chunkDuration = config.get('WHISPER_CHUNK_DURATION_SECONDS', 600);
    }
    async transcribe(videoPath) {
        this.logger.log(`Starting Whisper transcription: ${videoPath}`);
        const audioPath = await this.extractAudio(videoPath);
        try {
            const stat = fs.statSync(audioPath);
            if (stat.size <= WHISPER_MAX_BYTES) {
                return await this.transcribeFile(audioPath, 0);
            }
            else {
                this.logger.log(`Audio too large (${(stat.size / 1024 / 1024).toFixed(1)} MB) ` +
                    `— splitting into ${this.chunkDuration}s chunks`);
                return await this.transcribeInChunks(audioPath);
            }
        }
        finally {
            fs.unlink(audioPath, () => { });
        }
    }
    async transcribeFile(audioPath, timeOffset) {
        this.logger.debug(`Whisper API call: ${audioPath} (offset: ${timeOffset}s)`);
        const file = fs.createReadStream(audioPath);
        const response = await this.openai.audio.transcriptions.create({
            model: 'whisper-1',
            file,
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
        });
        const rawSegments = response.segments ?? [];
        const offsetSegments = rawSegments.map((s) => ({
            start: s.start + timeOffset,
            end: s.end + timeOffset,
            text: s.text,
        }));
        return this.utils.mergeWhisperToSentences(offsetSegments);
    }
    async transcribeInChunks(audioPath) {
        const chunks = await this.splitAudio(audioPath);
        const allSegments = [];
        let offset = 0;
        try {
            for (let i = 0; i < chunks.length; i++) {
                this.logger.log(`Transcribing chunk ${i + 1}/${chunks.length} (offset: ${offset}s)`);
                const segments = await this.transcribeFile(chunks[i], offset);
                allSegments.push(...segments);
                offset += this.chunkDuration;
            }
        }
        finally {
            chunks.forEach((c) => fs.unlink(c, () => { }));
        }
        return allSegments;
    }
    extractAudio(videoPath) {
        const outputPath = path.join(this.uploadDir, `audio-${(0, uuid_1.v4)()}.mp3`);
        return new Promise((resolve, reject) => {
            const ffmpegPath = this.config.get('FFMPEG_PATH') ||
                require('ffmpeg-static');
            const proc = (0, child_process_1.spawn)(ffmpegPath, [
                '-y',
                '-i',
                videoPath,
                '-vn',
                '-ar',
                '16000',
                '-ac',
                '1',
                '-b:a',
                '64k',
                outputPath,
            ]);
            proc.on('close', (code) => {
                if (code === 0)
                    resolve(outputPath);
                else
                    reject(new common_1.InternalServerErrorException('FFmpeg audio extraction failed'));
            });
            proc.on('error', reject);
        });
    }
    splitAudio(audioPath) {
        return new Promise((resolve, reject) => {
            const chunkPattern = path.join(this.uploadDir, `chunk-${(0, uuid_1.v4)()}-%03d.mp3`);
            const ffmpegPath = this.config.get('FFMPEG_PATH') ||
                require('ffmpeg-static');
            const proc = (0, child_process_1.spawn)(ffmpegPath, [
                '-y',
                '-i',
                audioPath,
                '-f',
                'segment',
                '-segment_time',
                String(this.chunkDuration),
                '-c',
                'copy',
                chunkPattern,
            ]);
            const stderrBuf = [];
            proc.stderr?.on('data', (d) => stderrBuf.push(d));
            proc.on('close', (code) => {
                if (code !== 0) {
                    const msg = Buffer.concat(stderrBuf).toString().slice(-200);
                    return reject(new common_1.InternalServerErrorException(`FFmpeg chunk split failed: ${msg}`));
                }
                const dir = path.dirname(chunkPattern);
                const prefix = path.basename(chunkPattern).replace('-%03d.mp3', '');
                const files = fs
                    .readdirSync(dir)
                    .filter((f) => f.startsWith(prefix) && f.endsWith('.mp3'))
                    .sort()
                    .map((f) => path.join(dir, f));
                resolve(files);
            });
            proc.on('error', reject);
        });
    }
};
exports.WhisperService = WhisperService;
exports.WhisperService = WhisperService = WhisperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        openedge_utils_service_1.OpenEdgeUtilsService])
], WhisperService);
//# sourceMappingURL=whisper.service.js.map